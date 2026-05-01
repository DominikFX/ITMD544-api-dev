import DataLoader from 'dataloader';
import { getConnection } from '../db/db';
import sql from 'mssql';

export const createLoaders = () => ({
  crewMemberLoader: new DataLoader(async (keys: readonly string[]) => {
    const pool = await getConnection();
    const request = pool.request();
    const inClauses = keys.map((key, index) => {
      request.input(`key${index}`, sql.UniqueIdentifier, key);
      return `@key${index}`;
    }).join(',');

    const result = await request.query(`SELECT * FROM CrewMembers WHERE id IN (${inClauses})`);
    const crewMap = new Map();
    result.recordset.forEach(row => crewMap.set(row.id.toString(), row));

    return keys.map(key => crewMap.get(key) || null);
  }),

  reservationEquipmentLoader: new DataLoader(async (keys: readonly string[]) => {
    const pool = await getConnection();
    const request = pool.request();
    const inClauses = keys.map((key, index) => {
      request.input(`key${index}`, sql.UniqueIdentifier, key);
      return `@key${index}`;
    }).join(',');

    const result = await request.query(`
      SELECT re.reservation_id, e.* 
      FROM Equipment e
      JOIN ReservationEquipment re ON e.id = re.equipment_id
      WHERE re.reservation_id IN (${inClauses})
    `);

    const equipmentMap = new Map<string, any[]>();
    result.recordset.forEach(row => {
      const resId = row.reservation_id.toString();
      if (!equipmentMap.has(resId)) {
        equipmentMap.set(resId, []);
      }
      equipmentMap.get(resId)!.push(row);
    });

    return keys.map(key => equipmentMap.get(key) || []);
  })
});
