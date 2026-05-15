const db = require('./database');

// 1. Registrar un pago
const registrarPago = (datos, callback) => {
    const { id_cuota, monto, metodo_pago } = datos;
    // En Postgres es mejor dejar que la base de datos use su CURRENT_TIMESTAMP
    // Pero si querés mandar la fecha desde JS, usamos el formato ISO.
    const fechaHoy = new Date().toISOString();

    // En Postgres no usamos db.serialize, usamos una lógica de promesas o 
    // simplemente ejecutamos las consultas. Para tu adaptador actual:
    const sql1 = `INSERT INTO pagos (id_cuota, fecha_pago, monto_pagado, metodo_pago) VALUES ($1, $2, $3, $4)`;
    
    db.run(sql1, [id_cuota, fechaHoy, monto, metodo_pago], (err) => {
        if (err) {
            console.error("Error al insertar pago:", err.message);
            return callback(err);
        }

        // Actualizamos el estado de la cuota
        const sql2 = `UPDATE cuotas SET estado_pago = 'PAGADO' WHERE id_cuota = $1`;
        db.run(sql2, [id_cuota], (err) => {
            if (err) {
                console.error("Error al actualizar cuota:", err.message);
                return callback(err);
            }
            callback(null);
        });
    });
};

// 2. Obtener reporte mensual (El cambio más importante por las fechas)
const obtenerReporteMensual = (mes, anio, callback) => {
    // CAMBIO: En Postgres no existe strftime. Usamos EXTRACT o TO_CHAR.
    // También cambiamos monto_abonado por monto_pagado para que coincida con tu nueva tabla.
    const sql = `
        SELECT 
            p.fecha_pago, 
            p.monto_pagado, 
            p.metodo_pago, 
            s.nombre, 
            s.apellido, 
            c.nombre_categoria
        FROM pagos p
        JOIN cuotas cu ON p.id_cuota = cu.id_cuota
        JOIN socios s ON cu.id_socio = s.id_socio
        JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE EXTRACT(MONTH FROM p.fecha_pago) = $1 
          AND EXTRACT(YEAR FROM p.fecha_pago) = $2
        ORDER BY p.fecha_pago DESC`;

    db.all(sql, [parseInt(mes), parseInt(anio)], (err, rows) => {
        if (err) {
            console.error("Error en reporte mensual:", err.message);
            return callback(err);
        }
        callback(null, rows);
    });
};

// 3. Generar cuotas del mes actual (Evitar duplicados)
const generarMesActual = (callback) => {
    const m = new Date().getMonth() + 1;
    const a = new Date().getFullYear();

    // CAMBIO: Postgres usa una sintaxis distinta para "ignorar" si ya existe.
    // Usamos una subconsulta para insertar solo a los socios que no tienen cuota este mes.
    const sql = `
        INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago)
        SELECT s.id_socio, $1, $2, cat.costo_mensual, 'PENDIENTE'
        FROM socios s
        JOIN categorias cat ON s.id_categoria = cat.id_categoria
        WHERE NOT EXISTS (
            SELECT 1 FROM cuotas c 
            WHERE c.id_socio = s.id_socio 
            AND c.mes = $1 
            AND c.anio = $2
        ) AND s.estado = 'Activo'
    `;

    db.run(sql, [m, a], (err) => {
        if (err) {
            console.error("Error al generar cuotas mensuales:", err.message);
            return callback(err);
        }
        callback(null);
    });
};

module.exports = {
    registrarPago,
    obtenerReporteMensual,
    generarMesActual
};