import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DB_CONNECTION_STRING;

if (!connectionString) {
  throw new Error('DB_CONNECTION_STRING environment variable is not defined.');
}

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getConnection(retries = 3, delayMs = 5000): Promise<sql.ConnectionPool> {
  if (poolPromise) return poolPromise;

  for (let i = 0; i < retries; i++) {
    try {
      poolPromise = new sql.ConnectionPool(connectionString!).connect();
      const pool = await poolPromise;
      console.log('Connected to Azure SQL Database');
      return pool;
    } catch (err: any) {
      poolPromise = null;
      console.error(`Database Connection Failed (Attempt ${i + 1}/${retries}):`, err.message);
      if (i === retries - 1) {
        console.error('Failed to connect to the database after multiple attempts. It might still be waking up or firewall issues.');
        throw err;
      }
      console.log(`Waiting ${delayMs / 1000}s before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Unreachable');
}
