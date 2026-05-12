const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

db.serialize(() => {
    console.log("Aplicando restricción de unicidad a las cuotas...");

    // Creamos un INDICE UNICO. 
    // Si alguien intenta insertar una cuota que ya existe para ese socio/mes/año, la DB dará error.
    const sqlIndex = `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cuota_unica 
        ON cuotas (id_socio, mes, anio)
    `;

    db.run(sqlIndex, (err) => {
        if (err) {
            console.error("❌ Error al aplicar la restricción:", err.message);
        } else {
            console.log("✅ Restricción aplicada: Un socio no podrá tener dos cuotas el mismo mes.");
        }
    });
});

db.close();