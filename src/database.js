const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); 

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, 
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de Postgres', err);
});

console.log("🔗 Intentando conectar a Supabase desde src/database.js...");

module.exports = {
  // CORRECCIÓN: Ahora query acepta el callback para no trabar el servidor
  query: (text, params, callback) => {
    return pool.query(text, params, callback);
  },
  
  all: (text, params, callback) => {
    pool.query(text, params, (err, res) => {
      if (err) return callback(err);
      callback(null, res.rows);
    });
  },

  get: (text, params, callback) => {
    pool.query(text, params, (err, res) => {
      if (err) return callback(err);
      callback(null, res.rows && res.rows.length > 0 ? res.rows[0] : null);
    });
  },

  run: (text, params, callback) => {
    // Esta función traduce los "?" a "$1, $2" por si quedó alguno en los scripts
    let i = 1;
    const pgSql = text.replace(/\?/g, () => `$${i++}`);
    pool.query(pgSql, params, (err, res) => {
      if (callback) callback(err, res);
    });
  }
};