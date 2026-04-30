import { getConnection } from '../db/db';
import sql from 'mssql';

export const resolvers = {
  Query: {
    crewMembers: async () => {
      const pool = await getConnection();
      const result = await pool.request().query('SELECT * FROM CrewMembers');
      return result.recordset;
    },
    equipment: async () => {
      const pool = await getConnection();
      const result = await pool.request().query('SELECT * FROM Equipment');
      return result.recordset;
    },
    reservations: async () => {
      const pool = await getConnection();
      const result = await pool.request().query('SELECT * FROM Reservations');
      return result.recordset.map((r: any) => ({
        ...r,
        checkout_date: r.checkout_date ? r.checkout_date.toISOString() : null,
        return_date: r.return_date ? r.return_date.toISOString() : null
      }));
    },
    reservation: async (_: any, { id }: { id: string }) => {
      const pool = await getConnection();
      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM Reservations WHERE id = @id');

      if (result.recordset.length === 0) return null;

      const r = result.recordset[0];
      return {
        ...r,
        checkout_date: r.checkout_date ? r.checkout_date.toISOString() : null,
        return_date: r.return_date ? r.return_date.toISOString() : null
      };
    }
  },
  Reservation: {
    crew_member: async (parent: any) => {
      const pool = await getConnection();
      const result = await pool.request()
        .input('crew_id', sql.UniqueIdentifier, parent.crew_id)
        .query('SELECT * FROM CrewMembers WHERE id = @crew_id');
      return result.recordset[0];
    },
    equipment: async (parent: any) => {
      const pool = await getConnection();
      const result = await pool.request()
        .input('reservation_id', sql.UniqueIdentifier, parent.id)
        .query(`
          SELECT e.* 
          FROM Equipment e
          JOIN ReservationEquipment re ON e.id = re.equipment_id
          WHERE re.reservation_id = @reservation_id
        `);
      return result.recordset;
    }
  },
  Mutation: {
    createCrewMember: async (_: any, { email, name, role }: { email: string, name: string, role: string }) => {
      const pool = await getConnection();
      const result = await pool.request()
        .input('email', sql.VarChar(255), email)
        .input('name', sql.VarChar(255), name)
        .input('role', sql.VarChar(100), role)
        .query(`
          INSERT INTO CrewMembers (email, name, role) 
          OUTPUT INSERTED.* 
          VALUES (@email, @name, @role)
        `);
      return result.recordset[0];
    },
    createEquipment: async (_: any, { sku, name, category }: { sku: string, name: string, category: string }) => {
      const pool = await getConnection();
      const result = await pool.request()
        .input('sku', sql.VarChar(100), sku)
        .input('name', sql.VarChar(255), name)
        .input('category', sql.VarChar(100), category)
        .query(`
          INSERT INTO Equipment (sku, name, category, is_available) 
          OUTPUT INSERTED.* 
          VALUES (@sku, @name, @category, 1)
        `);
      return result.recordset[0];
    },
    createReservation: async (_: any, { checkout_date, return_date, event_venue, status, crew_id, equipment_ids }: { checkout_date?: string, return_date: string, event_venue: string, status: string, crew_id: string, equipment_ids: string[] }) => {
      const pool = await getConnection();
      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();
        const request = transaction.request();

        const checkout = checkout_date ? new Date(checkout_date) : new Date();
        const returned = new Date(return_date);

        request.input('checkout_date', sql.DateTime, checkout);
        request.input('return_date', sql.DateTime, returned);
        request.input('event_venue', sql.VarChar(255), event_venue);
        request.input('status', sql.VarChar(50), status);
        request.input('crew_id', sql.UniqueIdentifier, crew_id);

        const resResult = await request.query(`
          INSERT INTO Reservations (checkout_date, return_date, event_venue, status, crew_id) 
          OUTPUT INSERTED.* 
          VALUES (@checkout_date, @return_date, @event_venue, @status, @crew_id)
        `);

        const reservation = resResult.recordset[0];

        for (const eq_id of equipment_ids) {
          const eqReq = transaction.request();
          eqReq.input('reservation_id', sql.UniqueIdentifier, reservation.id);
          eqReq.input('equipment_id', sql.UniqueIdentifier, eq_id);
          await eqReq.query(`
            INSERT INTO ReservationEquipment (reservation_id, equipment_id)
            VALUES (@reservation_id, @equipment_id)
          `);
        }

        await transaction.commit();

        return {
          ...reservation,
          checkout_date: reservation.checkout_date ? reservation.checkout_date.toISOString() : null,
          return_date: reservation.return_date ? reservation.return_date.toISOString() : null
        };
      } catch (err) {
        await transaction.rollback();
        console.error("Transaction failed:", err);
        throw err;
      }
    },
    updateReservationStatus: async (_: any, { id, status }: { id: string, status: string }) => {
      const pool = await getConnection();
      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('status', sql.VarChar(50), status)
        .query(`
          UPDATE Reservations 
          SET status = @status 
          OUTPUT INSERTED.* 
          WHERE id = @id
        `);

      if (result.recordset.length === 0) {
        throw new Error("Reservation not found");
      }

      const r = result.recordset[0];
      return {
        ...r,
        checkout_date: r.checkout_date ? r.checkout_date.toISOString() : null,
        return_date: r.return_date ? r.return_date.toISOString() : null
      };
    },
    cancelReservation: async (_: any, { id }: { id: string }) => {
      const pool = await getConnection();
      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          DELETE FROM Reservations 
          WHERE id = @id
        `);
      return (result.rowsAffected?.[0] ?? 0) > 0;
    }
  }
};
