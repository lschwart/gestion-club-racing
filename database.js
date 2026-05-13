const { Pool } = require('pg');

// Railway inyectará automáticamente la DATABASE_URL que configuraste
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  // Para consultas generales
  query: (text, params) => pool.query(text, params),

  // EMULACIÓN DE SQLITE PARA TUS CONTROLADORES:
  
  // Para SELECT de muchos registros (ej: lista de socios)
  all: (text, params, callback) => {
    pool.query(text, params, (err, res) => {
      if (err) return callback(err);
      callback(null, res.rows);
    });
  },

  // Para SELECT de un solo registro (ej: buscar un socio por ID)
  get: (text, params, callback) => {
    pool.query(text, params, (err, res) => {
      if (err) return callback(err);
      callback(null, res.rows[0]);
    });
  },

  // Para INSERT, UPDATE, DELETE
  run: (text, params, callback) => {
    // Convertimos los "?" de SQLite a "$1, $2" de PostgreSQL automáticamente
    let i = 1;
    const pgSql = text.replace(/\?/g, () => `$${i++}`);
    
    pool.query(pgSql, params, (err, res) => {
      if (callback) callback(err, res);
    });
  }
};