const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

function procesarPagoSocio(idSocio, mes, anio, metodoPago) {
    db.serialize(() => {
        // 1. Verificamos si la cuota existe y cuál es su estado actual
        const sqlConsultar = `SELECT c.id_cuota, c.estado_pago, c.monto_original, s.nombre
                              FROM cuotas c
                              JOIN socios s ON c.id_socio = s.id_socio 
                              WHERE c.id_socio = ? AND mes = ? AND anio = ?`;            

        db.get(sqlConsultar, [idSocio, mes, anio], (err, cuota) => {
            if (err) return console.error("Error al buscar cuota:", err.message);
            
            if (!cuota) {
                return console.log(`[Error] No existe una cuota generada para el socio ${idSocio} en el periodo ${mes}/${anio}.`);
            }

            if (cuota.estado_pago === 'PAGADO') {
                return console.log(`[Aviso] La cuota ${mes}/${anio} ya fue abonada anteriormente por el socio ${idSocio}.`);
            }

            // 2. Si está pendiente, procedemos a actualizar
            console.log(`Registrando pago de $${cuota.monto_original} para el socio ${idSocio}...`);

            // Iniciamos una pequeña "transacción" manual
            db.run(`UPDATE cuotas SET estado_pago = 'PAGADO' WHERE id_cuota = ?`, [cuota.id_cuota], (err) => {
                if (err) return console.error("Error al actualizar cuota:", err.message);

                // 3. Insertamos el registro en la tabla de PAGOS para el historial
                const sqlHistorial = `INSERT INTO pagos (id_cuota, monto_abonado, metodo_pago, fecha_pago) 
                                      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
                
                db.run(sqlHistorial, [cuota.id_cuota, cuota.monto_original, metodoPago], function(err) {
                    if (err) return console.error("Error en historial:", err.message);
                    
                    console.log("-------------------------------------------");
                    console.log("¡PAGO REGISTRADO CON ÉXITO!");
                    console.log(`Comprobante Nº: ${this.lastID}`);
                    console.log(`Socio ID: ${idSocio} | Periodo: ${mes}/${anio}`);
                    console.log("-------------------------------------------");
                });
            });
        });
    });
}

// EJEMPLO: Lucas (ID 1) paga su cuota de Marzo 2026 por Transferencia
procesarPagoSocio(5, 3, 2026, 'Transferencia Bancaria');