const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

// Exportamos la conexión directamente
module.exports = db;