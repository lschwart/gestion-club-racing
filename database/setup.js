const sqlite3 = require('sqlite3').verbose();
// Esto crea el archivo fisico de la base de datos
const db = new sqlite3.Database('./database/socios.db');

db.serialize(() => {
    console.log("Creando tablas...");

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
        costo_mensual,
        estado_pago TEXT DEFAULT 'PENDIENTE',
        FOREIGN KEY(id_socio) REFERENCES socios(id_socio)
    )`);

    // Insertamos una categoria inicial para probar
    db.run(`INSERT INTO categorias (nombre_categoria, costo_mensual) VALUES ('Estándar', 1500.00)`);

    console.log("¡Base de datos lista! Se ha creado el archivo 'socios.db'");
});

db.close();