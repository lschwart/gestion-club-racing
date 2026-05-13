const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 1. Forzamos una única ruta para evitar duplicados
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// USAMOS 'database.db' porque es el que tus controladores están buscando según el log
const dbPath = path.join(dataDir, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Error al abrir BD:", err.message);
    else console.log("🚀 SISTEMA CONECTADO EN:", dbPath);
});

// 2. Estructura exacta de tu setup.js + Compatibilidad
db.serialize(() => {
    console.log("🛠️ Verificando tablas del San Cristóbal LTC...");

    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_categoria TEXT,
        costo_mensual DECIMAL(10,2)
    )`);

    // Agregamos 'id_socio' y también 'id' por si las moscas
    db.run(`CREATE TABLE IF NOT EXISTS socios (
        id_socio INTEGER PRIMARY KEY AUTOINCREMENT,
        id INTEGER, 
        nombre TEXT,
        apellido TEXT,
        dni TEXT UNIQUE,
        id_categoria INTEGER,
        estado TEXT DEFAULT 'Activo',
        FOREIGN KEY(id_categoria) REFERENCES categorias(id_categoria)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cuotas (
        id_cuota INTEGER PRIMARY KEY AUTOINCREMENT,
        id_socio INTEGER,
        mes INTEGER,
        anio INTEGER,
        costo_mensual REAL,
        estado_pago TEXT DEFAULT 'PENDIENTE',
        FOREIGN KEY(id_socio) REFERENCES socios(id_socio)
    )`);

    // Inicializar categoría básica
    db.get("SELECT COUNT(*) as count FROM categorias", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO categorias (nombre_categoria, costo_mensual) VALUES ('Estándar', 1500.00)`);
        }
    });
});

module.exports = db;