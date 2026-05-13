const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 1. Ruta de la carpeta (Prioridad Railway)
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');

// 2. Crear carpeta si no existe
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'socios.db');
const db = new sqlite3.Database(dbPath);

// 3. Inicialización completa de tablas
db.serialize(() => {
    // Tabla Categorías
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        cuota REAL
    )`);

    // Tabla Socios
    db.run(`CREATE TABLE IF NOT EXISTS socios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        apellido TEXT,
        dni TEXT,
        fecha_nacimiento TEXT,
        id_categoria INTEGER,
        estado TEXT DEFAULT 'Activo',
        FOREIGN KEY(id_categoria) REFERENCES categorias(id)
    )`);

    // Tabla Pagos
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

    // --- IMPORTANTE: Insertar categorías iniciales si la tabla está vacía ---
    db.get("SELECT COUNT(*) as count FROM categorias", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO categorias (nombre, cuota) VALUES ('Activo', 1000), ('Cadete', 500), ('Vitalicio', 0)`);
            console.log("✅ Categorías iniciales creadas");
        }
    });
});

module.exports = db;