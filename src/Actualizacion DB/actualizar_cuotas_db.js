const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

db.serialize(() => {
    console.log("Actualizando tabla cuotas...");
    
    // Agregamos la columna que falta
    db.run(`ALTER TABLE cuotas ADD COLUMN monto_original DECIMAL(10,2)`, (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("La columna ya existía.");
            } else {
                console.error("Error:", err.message);
            }
        } else {
            console.log("¡Columna monto_original agregada con éxito!");
        }
    });

    // También actualizamos la tabla para que las cuotas viejas tengan un valor
    // (Pondremos 1500 por defecto para que no queden vacías)
    db.run(`UPDATE cuotas SET monto_original = 1500.00 WHERE monto_original IS NULL`);
});

db.close();