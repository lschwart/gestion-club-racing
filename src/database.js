const { Pool } = require('pg');

// Usamos la variable de entorno de Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log("🔗 Intentando conectar a Supabase desde src/database.js...");

module.exports = {
  query: (text, params) => pool.query(text, params),
  
  // Estas funciones "engañan" a tus controladores viejos para que funcionen con Postgres
  all: (text, params, callback) => {
    pool.query(text, params, (err, res) => {
      if (err) return callback(err);
      callback(null, res.rows);
    });
  },
  get: (text, params, callback) => {
    pool.query(text, params, (err, res) => {
      if (err) return callback(err);
      callback(null, res.rows ? res.rows[0] : null);
    });
  },
  run: (text, params, callback) => {
    // Convierte "?" a "$1, $2..." automáticamente
    let i = 1;
    const pgSql = text.replace(/\?/g, () => `$${i++}`);
    pool.query(pgSql, params, (err, res) => {
      if (callback) callback(err, res);
    });
  }
};