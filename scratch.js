require('dotenv').config();
const sql = require('mssql');

(async () => {
  try {
    console.log('Testing DB connection...');
    await sql.connect(process.env.DB_CONNECTION_STRING);
    console.log('DB Connection successful!');
    process.exit(0);
  } catch (err) {
    console.error('DB Connection failed:', err);
    process.exit(1);
  }
})();
