const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

// Función para registrar un socio y su cuota
function registrarNuevoSocio(nombre, apellido, dni, idCat) {
    db.serialize(() => {
        // 1. Insertar al socio
        const sqlSocio = `INSERT INTO socios (nombre, apellido, dni, id_categoria) VALUES (?, ?, ?, ?)`;
        
        db.run(sqlSocio, [nombre, apellido, dni, idCat], function(err) {
            if (err) return console.error("Error al socio:", err.message);

            const idGenerado = this.lastID;
            console.log(`Socio ${nombre} registrado con ID: ${idGenerado}`);

            // 2. Generar su primera cuota (Marzo 2026)
            const sqlCuota = `INSERT INTO cuotas (id_socio, mes, anio) VALUES (?, ?, ?)`;
            db.run(sqlCuota, [idGenerado, 3, 2026], (err) => {
                if (err) return console.error("Error al crear cuota:", err.message);
                console.log("Cuota inicial generada exitosamente.");
            });
        });
    });
}

// Probamos la función
registrarNuevoSocio("NATALIA", "FURON", "31690889", 1);