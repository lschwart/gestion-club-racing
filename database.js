const { Pool } = require('pg');

// Usamos la URL que pusiste en Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Esto es clave para que Railway conecte a Supabase
  }
});

// Adaptador para que tus controladores sigan funcionando sin cambios locos
module.exports = {
  query: (text, params) => pool.query(text, params),
  
  // Estas funciones emulan el comportamiento de sqlite3 para que no se rompa el bkp
  all: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows))
      .catch(err => callback(err));
  },
  get: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows[0]))
      .catch(err => callback(err));
  },
  run: (text, params, callback) => {
    pool.query(text, params)
      .then(res => { if(callback) callback(null, res); })
      .catch(err => { if(callback) callback(err); });
  }
};