const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

db.serialize(() => {
    console.log("Actualizando tabla socios...");

    // 1. Agregamos la columna 'estado' con un valor por defecto
    db.run(`ALTER TABLE socios ADD COLUMN estado TEXT DEFAULT 'Activo'`, (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("La columna 'estado' ya existe.");
            } else {
                console.error("Error al agregar columna:", err.message);
            }
        } else {
            console.log("✅ Columna 'estado' agregada con éxito.");
        }
    });

    // 2. Por si acaso, nos aseguramos de que todos los socios actuales sean 'Activos'
    db.run(`UPDATE socios SET estado = 'Activo' WHERE estado IS NULL`, (err) => {
        if (!err) console.log("✅ Estados de socios actualizados.");
    });
});

db.close();