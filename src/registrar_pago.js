const db = require('./database'); // Importamos la conexión a Supabase

function procesarPagoSocio(idSocio, mes, anio, metodoPago) {
    // 1. Verificamos si la cuota existe y cuál es su estado actual
    // CAMBIO: monto_original -> monto | ? -> $1, $2, $3
    const sqlConsultar = `
        SELECT c.id_cuota, c.estado_pago, c.monto, s.nombre
        FROM cuotas c
        JOIN socios s ON c.id_socio = s.id_socio 
        WHERE c.id_socio = $1 AND c.mes = $2 AND c.anio = $3
    `;            

    db.get(sqlConsultar, [idSocio, mes, anio], (err, cuota) => {
        if (err) return console.error("❌ Error al buscar cuota:", err.message);
        
        if (!cuota) {
            return console.log(`⚠️ [Error] No existe cuota para el socio ${idSocio} en el periodo ${mes}/${anio}.`);
        }

        if (cuota.estado_pago === 'PAGADO') {
            return console.log(`ℹ️ [Aviso] La cuota ${mes}/${anio} ya fue abonada por ${cuota.nombre}.`);
        }

        console.log(`⏳ Registrando pago de $${cuota.monto} para el socio ${idSocio}...`);

        // 2. Actualizamos la cuota
        const sqlUpdate = `UPDATE cuotas SET estado_pago = 'PAGADO' WHERE id_cuota = $1`;
        
        db.run(sqlUpdate, [cuota.id_cuota], (err) => {
            if (err) return console.error("❌ Error al actualizar cuota:", err.message);

            // 3. Insertamos el registro en la tabla de PAGOS (con RETURNING para el ID)
            // CAMBIO: monto_abonado -> monto_pagado | CURRENT_TIMESTAMP es nativo de Postgres
            const sqlHistorial = `
                INSERT INTO pagos (id_cuota, monto_pagado, metodo_pago, fecha_pago) 
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                RETURNING id_pago
            `;
            
            // Usamos db.query para capturar el RETURNING en Postgres
            db.query(sqlHistorial, [cuota.id_cuota, cuota.monto, metodoPago], (err, res) => {
                if (err) return console.error("❌ Error en historial:", err.message);
                
                const idPagoGenerado = res.rows[0].id_pago;

                console.log("-------------------------------------------");
                console.log("¡PAGO REGISTRADO CON ÉXITO EN SUPABASE!");
                console.log(`Nº Operación: ${idPagoGenerado}`);
                console.log(`Socio: ${cuota.nombre} | Periodo: ${mes}/${anio}`);
                console.log(`Monto: $${cuota.monto} | Método: ${metodoPago}`);
                console.log("-------------------------------------------");
            });
        });
    });
}

// EJEMPLO DE USO:
// procesarPagoSocio(1, 3, 2026, 'Efectivo');

module.exports = { procesarPagoSocio };