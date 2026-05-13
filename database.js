const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 1. Definimos la ruta. En Railway usará /app/data, en tu PC usará una carpeta data local.
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');

// 2. ¡ESTO ES LO QUE FALTA! Si la carpeta no existe, la creamos por código
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("✅ Carpeta de datos creada satisfactoriamente");
}

const dbPath = path.join(dataDir, 'socios.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Error al abrir la base de datos:", err.message);
    } else {
        console.log("🚀 Conectado a la base de datos en:", dbPath);
    }
});

// 3. CREACIÓN AUTOMÁTICA DE TABLAS (Para que no tire error al estar vacía)
db.serialize(() => {
    // Tabla de Socios
    db.run(`CREATE TABLE IF NOT EXISTS socios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        apellido TEXT,
        dni TEXT,
        fecha_nacimiento TEXT,
        id_categoria INTEGER,
        estado TEXT DEFAULT 'Activo'
    )`);

    // Tabla de Categorías (Si la usás)
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        cuota REAL
    )`);

    // Tabla de Pagos
    db.run(`CREATE TABLE IF NOT EXISTS pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_socio INTEGER,
        mes TEXT,
        anio TEXT,
        monto_abonado REAL,
        fecha_pago TEXT,
        metodo_pago TEXT,
        FOREIGN KEY(id_socio) REFERENCES socios(id)
    )`);
});

module.exports = db;