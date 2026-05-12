const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

db.serialize(() => {
    // Ejemplo: Supongamos que queremos cambiar 'mes' por 'mes_pago' en la tabla cuotas
    const tabla = 'cuotas';
    const nombreViejo = 'costo_mensual';
    const nombreNuevo = 'monto_original';

    console.log(`Cambiando columna ${nombreViejo} a ${nombreNuevo}...`);

    db.run(`ALTER TABLE ${tabla} RENAME COLUMN ${nombreViejo} TO ${nombreNuevo}`, (err) => {
        if (err) {
            console.error("Error al renombrar:", err.message);
        } else {
            console.log("¡Columna renombrada con éxito!");
        }
    });
});

db.close();