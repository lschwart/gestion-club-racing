const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 1. Ruta del Volumen en Railway
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 2. Conexión centralizada
const dbPath = path.join(dataDir, 'socios.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Error BD:", err.message);
    else console.log("✅ Base de datos conectada en:", dbPath);
});

// 3. Estructura con nombres compatibles (id e id_socio)
db.serialize(() => {
    console.log("🛠️ Verificando estructura del Club San Cristóbal...");

    // Tabla Categorías
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_categoria TEXT,
        costo_mensual DECIMAL(10,2)
    )`);

    // Tabla Socios (Agregamos 'id' como alias de 'id_socio' para evitar el error del log)
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

    // Tabla Pagos
    db.run(`CREATE TABLE IF NOT EXISTS pagos (
        id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
        id_socio INTEGER,
        id_cuota INTEGER,
        monto_abonado REAL,
        fecha_pago TEXT,
        metodo_pago TEXT,
        FOREIGN KEY(id_socio) REFERENCES socios(id_socio),
        FOREIGN KEY(id_cuota) REFERENCES cuotas(id_cuota)
    )`);

    // Insertar datos básicos si está vacío
    db.get("SELECT COUNT(*) as count FROM categorias", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO categorias (nombre_categoria, costo_mensual) VALUES ('Estándar', 1500.00)`);
        }
    });
});

module.exports = db;