import express from 'express';
import { getConnection } from '../db/db';
import sql from 'mssql';

const router = express.Router();

// API INDEX
router.get('/', (req, res) => {
  res.json({
    name: 'A/V Equipment Vault API',
    status: 'online',
    version: '1.0.0',
    links: {
      graphql: '/graphql',
      docs: '/docs',
      crew: '/crew',
      equipment: '/equipment',
      reservations: '/reservations',
      reset: '/reset'
    }
  });
});

// SEED / RESET DB
router.post('/reset', async (req, res) => {
  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = transaction.request();

    await request.query(`
      DELETE FROM ReservationEquipment;
      DELETE FROM Reservations;
      DELETE FROM Equipment;
      DELETE FROM CrewMembers;
    `);

    await request.query(`
      INSERT INTO CrewMembers (email, name, role) VALUES 
      ('chris@avvault.com', 'Christopher Nolan', 'Director'),
      ('hans@avvault.com', 'Hans Zimmer', 'Audio Engineer'),
      ('roger@avvault.com', 'Roger Deakins', 'Cinematographer');
    `);

    await request.query(`
      INSERT INTO Equipment (sku, name, category, is_available) VALUES 
      ('CAM-RED-01', 'RED Komodo 6K Cinema Camera', 'Camera', 1),
      ('CAM-ARRI-01', 'ARRI Alexa Mini LF', 'Camera', 1),
      ('LENS-SIG-01', 'Sigma 18-35mm T2 Cine Lens', 'Lens', 1),
      ('AUD-ROD-01', 'Rode NTG4+ Shotgun Microphone', 'Audio', 1),
      ('LIG-APE-01', 'Aputure LS 600d Pro LED Light', 'Lighting', 1);
    `);

    await request.query(`
      DECLARE @CrewId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM CrewMembers);
      DECLARE @EqId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM Equipment);
      
      DECLARE @ResId TABLE (id UNIQUEIDENTIFIER);

      INSERT INTO Reservations (checkout_date, return_date, event_venue, status, crew_id) 
      OUTPUT INSERTED.id INTO @ResId
      VALUES (GETDATE(), DATEADD(day, 2, GETDATE()), 'Hermann Hall Aud', 'Pending', @CrewId);

      INSERT INTO ReservationEquipment (reservation_id, equipment_id)
      SELECT id, @EqId FROM @ResId;
    `);

    await transaction.commit();
    res.json({ message: 'Database wiped and seeded with realistic dummy data!' });
  } catch (err) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ error: 'Database reset failed', details: (err as any).message });
  }
});

const getPagination = (req: express.Request) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  return { limit, offset };
};

// CREW MEMBERS
router.get('/crew', async (req, res) => {
  try {
    const { limit, offset } = getPagination(req);
    const pool = await getConnection();
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query('SELECT * FROM CrewMembers ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.get('/crew/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM CrewMembers WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.post('/crew', async (req, res) => {
  const { email, name, role } = req.body;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('email', sql.VarChar(255), email)
      .input('name', sql.VarChar(255), name)
      .input('role', sql.VarChar(100), role)
      .query('INSERT INTO CrewMembers (email, name, role) OUTPUT INSERTED.* VALUES (@email, @name, @role)');
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.put('/crew/:id', async (req, res) => {
  const { name, role } = req.body;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .input('name', sql.VarChar(255), name)
      .input('role', sql.VarChar(100), role)
      .query('UPDATE CrewMembers SET name = @name, role = @role OUTPUT INSERTED.* WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.delete('/crew/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM CrewMembers WHERE id = @id');
    if ((result.rowsAffected?.[0] ?? 0) === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

// EQUIPMENT
router.get('/equipment', async (req, res) => {
  try {
    const { limit, offset } = getPagination(req);
    const pool = await getConnection();
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query('SELECT * FROM Equipment ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.get('/equipment/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Equipment WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.post('/equipment', async (req, res) => {
  const { sku, name, category } = req.body;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('sku', sql.VarChar(100), sku)
      .input('name', sql.VarChar(255), name)
      .input('category', sql.VarChar(100), category)
      .query('INSERT INTO Equipment (sku, name, category) OUTPUT INSERTED.* VALUES (@sku, @name, @category)');
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.put('/equipment/:id', async (req, res) => {
  const { name, category, is_available } = req.body;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .input('name', sql.VarChar(255), name)
      .input('category', sql.VarChar(100), category)
      .input('is_available', sql.Bit, is_available ? 1 : 0)
      .query('UPDATE Equipment SET name = @name, category = @category, is_available = @is_available OUTPUT INSERTED.* WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.delete('/equipment/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM Equipment WHERE id = @id');
    if ((result.rowsAffected?.[0] ?? 0) === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

// --- RESERVATIONS ---

router.get('/reservations', async (req, res) => {
  try {
    const { limit, offset } = getPagination(req);
    const pool = await getConnection();
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query('SELECT * FROM Reservations ORDER BY checkout_date DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.get('/reservations/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('SELECT * FROM Reservations WHERE id = @id');

    if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.post('/reservations', async (req, res) => {
  const { checkout_date, return_date, event_venue, status, crew_id, equipment_ids } = req.body;

  if (!return_date || !event_venue || !status || !crew_id || !equipment_ids || equipment_ids.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

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

    // Insert junction records
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
    res.status(201).json(reservation);
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: 'Transaction failed', details: (err as any).message });
  }
});

router.put('/reservations/:id', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .input('status', sql.VarChar(50), status)
      .query(`
        UPDATE Reservations 
        SET status = @status 
        OUTPUT INSERTED.* 
        WHERE id = @id
      `);

    if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

router.delete('/reservations/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('DELETE FROM Reservations WHERE id = @id');

    if ((result.rowsAffected?.[0] ?? 0) === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as any).message });
  }
});

export default router;
