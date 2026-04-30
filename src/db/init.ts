import { getConnection } from './db';

const initDbScript = `
-- CrewMembers Table
IF OBJECT_ID('CrewMembers', 'U') IS NULL
BEGIN
    CREATE TABLE CrewMembers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL
    );
END

-- Equipment Table
IF OBJECT_ID('Equipment', 'U') IS NULL
BEGIN
    CREATE TABLE Equipment (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_available BIT DEFAULT 1
    );
END

-- Reservations Table
IF OBJECT_ID('Reservations', 'U') IS NULL
BEGIN
    CREATE TABLE Reservations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        checkout_date DATETIME DEFAULT GETDATE(),
        return_date DATETIME NOT NULL,
        event_venue VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        crew_id UNIQUEIDENTIFIER NOT NULL,
        CONSTRAINT FK_Reservations_Crew FOREIGN KEY (crew_id) REFERENCES CrewMembers(id)
    );
END

-- Combo Table
IF OBJECT_ID('ReservationEquipment', 'U') IS NULL
BEGIN
    CREATE TABLE ReservationEquipment (
        reservation_id UNIQUEIDENTIFIER NOT NULL,
        equipment_id UNIQUEIDENTIFIER NOT NULL,
        PRIMARY KEY (reservation_id, equipment_id),
        CONSTRAINT FK_ResEq_Reservation FOREIGN KEY (reservation_id) REFERENCES Reservations(id) ON DELETE CASCADE,
        CONSTRAINT FK_ResEq_Equipment FOREIGN KEY (equipment_id) REFERENCES Equipment(id) ON DELETE CASCADE
    );
END
`;

export async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    const pool = await getConnection();
    await pool.request().query(initDbScript);
    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

if (require.main === module) {
  initializeDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
