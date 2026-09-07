const { Pool } = require('pg');

// Railway inyecta DATABASE_URL automaticamente cuando conectas un Postgres al proyecto
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

module.exports = pool;
