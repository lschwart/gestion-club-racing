const cron = require('node-cron');
const db = require('./database');

// Esta función genera las cuotas para TODOS los socios ACTIVOS en Supabase
const generarCuotasMensuales = () => {
    const fechaActual = new Date();
    const mes = fechaActual.getMonth() + 1; // Enero es 0
    const anio = fechaActual.getFullYear();

    console.log(`🚀 [${new Date().toLocaleTimeString()}] Iniciando generación de cuotas para ${mes}/${anio}...`);

    // 1. Buscamos socios activos y su costo de categoría
    // CAMBIO: corregí "s,id_socio" por "s.id_socio" y "id_categorias" por "id_categoria"
    const sqlSocios = `
        SELECT s.id_socio, c.costo_mensual
        FROM socios s
        JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE s.estado = 'Activo'
    `;
    
    db.all(sqlSocios, [], (err, socios) => {
        if (err) {
            return console.error("❌ Error al buscar socios y categorías:", err.message);
        }

        if (!socios || socios.length === 0) {
            return console.log("⚠️ No hay socios activos para generar cuotas.");
        }

        // 2. Usamos la potencia de PostgreSQL para insertar todas las cuotas faltantes de una sola vez
        // Esto es mucho más eficiente que un forEach en la nube
        const sqlInsertMasivo = `
            INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago)
            SELECT s.id_socio, $1, $2, cat.costo_mensual, 'PENDIENTE'
            FROM socios s
            JOIN categorias cat ON s.id_categoria = cat.id_categoria
            WHERE s.estado = 'Activo'
            AND NOT EXISTS (
                SELECT 1 FROM cuotas c 
                WHERE c.id_socio = s.id_socio 
                AND c.mes = $1 
                AND c.anio = $2
            )
        `;

        db.run(sqlInsertMasivo, [mes, anio], (err) => {
            if (err) {
                console.error("❌ Error en la generación masiva de cuotas:", err.message);
            } else {
                console.log(`✅ Proceso finalizado en Supabase. Se generaron las cuotas de ${mes}/${anio} para los socios que no la tenían.`);
            }
        });
    });
};

// Programado para el día 1 de cada mes a las 00:00
cron.schedule('0 0 1 * *', () => {
    generarCuotasMensuales();
});

// También lo exportamos por si queremos forzar la generación desde otro lado
module.exports = { generarCuotasMensuales };