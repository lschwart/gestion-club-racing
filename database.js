const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 1. Definir ruta (Usa el volumen de Railway si existe)
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// IMPORTANTE: Asegurate que este nombre coincida con el que ves en el log
const dbPath = path.join(dataDir, 'database.db'); 

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error al abrir BD:", err.message);
    else console.log("✅ Conectado a:", dbPath);
});

// 2. FORZAR LA CREACIÓN DE TABLAS
db.serialize(() => {
    console.log("🛠️ Verificando tablas...");
    
    // Tabla de Socios
    db.run(`CREATE TABLE IF NOT EXISTS socios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        apellido TEXT,
        dni TEXT,
        fecha_nacimiento TEXT,
        id_categoria INTEGER,
        estado TEXT DEFAULT 'Activo'
    )`, (err) => { if (err) console.log("Error creando socios:", err); });

    // Tabla de Categorías (Fundamental para que no falle el listar)
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        cuota REAL
    )`, (err) => {
        if (!err) {
            // Insertamos categorías básicas si la tabla está recién creada
            db.get("SELECT COUNT(*) as count FROM categorias", (err, row) => {
                if (row && row.count === 0) {
                    db.run("INSERT INTO categorias (nombre, cuota) VALUES ('Activo', 1000), ('Cadete', 500)");
                }
            });
        }
    });

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