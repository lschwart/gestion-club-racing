const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 1. Ruta inteligente: Volumen en Railway o carpeta local
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'database');

// 2. Crear carpeta si no existe
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Usamos el nombre 'socios.db' que tenías en tu setup original
const dbPath = path.join(dataDir, 'socios.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Error al abrir BD:", err.message);
    else console.log("✅ Base de datos conectada en:", dbPath);
});

// 3. Inicialización basada exactamente en tu setup.js
db.serialize(() => {
    console.log("🛠️ Verificando estructura del Club San Cristóbal...");

    // Tabla Categorias
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_categoria TEXT,
        costo_mensual DECIMAL(10,2)
    )`);

    // Tabla Socios
    db.run(`CREATE TABLE IF NOT EXISTS socios (
        id_socio INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        apellido TEXT,
        dni TEXT UNIQUE,
        id_categoria INTEGER,
        FOREIGN KEY(id_categoria) REFERENCES categorias(id_categoria)
    )`);

    // Tabla Cuotas
    db.run(`CREATE TABLE IF NOT EXISTS cuotas (
        id_cuota INTEGER PRIMARY KEY AUTOINCREMENT,
        id_socio INTEGER,
        mes INTEGER,
        anio INTEGER,
        costo_mensual REAL,
        estado_pago TEXT DEFAULT 'PENDIENTE',
        FOREIGN KEY(id_socio) REFERENCES socios(id_socio)
    )`);

    // --- DATOS INICIALES ---
    // Insertamos la categoría inicial solo si la tabla está vacía para no duplicar
    db.get("SELECT COUNT(*) as count FROM categorias", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO categorias (nombre_categoria, costo_mensual) VALUES ('Estándar', 1500.00)`);
            console.log("✅ Categoría 'Estándar' creada.");
        }
    });
});

module.exports = db;