const cron = require('node-cron');
const db = require ('./database');

//Esta funcion genera las cuotas para TODOS los socios ACTIVOS
const generarCuotasMensuales = () => {
    const fechaActual = new Date();
    const mes = fechaActual.getMonth() + 1; // getMonth devuelve 0-11
    const anio = fechaActual.getFullYear();

    console.log (`🚀 [${new Date().toLocaleTimeString()}] Iniciando generacón de cuotas para ${mes}/${anio}...`);

    // 1. Buscamos socios activos y traemos el costo de su categoria medainte un JOIN
    const sqlSocios = `SELECT
                            s,id_socio,
                            c.costo_mensual
                        FROM socios s
                        JOIN categorias c ON s.id_categorias = c.id_categoria
                        WHERE s.estado = 'Activo'
                       `;
    
    db.all(sqlSocios, [], (err, socios) => {
        if (err) {
            return console.error("❌ Error al buscar socios y categorías:", err.message);
        }

        if (socios.length === 0){
            return console.log("⚠️ No hay socios activos para generar cuotas.");
        }

        let coutasCreadas = 0;

        socios.forEach(socio => {
            //2. Insertamos la cuota usando el monto especifico de su categoria
            // El WHERE NOT EXISTS evita duplicar si ya se genero este mes
            const sqlInsert = `
                INSERT INTO cuotas (id_socio, mes, anio, monto_original, estado_pago)
                SELECT ?, ?, ?, ?, 'PENDIENTE'
                WHERE NOT EXISTS (
                    SELECT 1 FROM cuotas WHERE id_socio = ? AND mes = ?  AND anio = ?
                )
            `;

            const params = [
                socio.id_socio, mes, anio, socio.costo_mensual, // Datos para el INSERT
                socio.id_socio, mes, anio                       // Datos para el WHERE NOT EXISTS
            ];

            db.run(sqlInsert, params, function(err){
                if (err){
                    console.error(`❌ Error para socio ID ${socio.id_socio}:`, err.message);
                } else if (this.changes > 0){
                    coutasCreadas++;
                }
            });
        });
        // Nota: Debido a la naturaleza asincronica de SQLite, este log puede salir antes de terminar
        //       pero el proceso se ejecuta correctamente.
        console.log(`✅ Proceso finalizado. Se revisaron ${socios.length} socios.`);
    });
};

// Programado para el dia 1 de cada mes a las 00:00
cron.schedule('0 0 1 * *', () => {
    generarCuotasMensuales();
});

module.exports = { generarCuotasMensuales };