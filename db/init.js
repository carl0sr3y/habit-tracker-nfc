// Ejecuta el schema.sql contra la base de datos configurada en DATABASE_URL
// Uso: npm run db:init
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Schema aplicado correctamente.');
  } catch (err) {
    console.error('Error aplicando el schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
