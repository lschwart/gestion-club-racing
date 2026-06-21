const db = require('./database');

// 1. Registrar un Pago (Corregido sin db.serialize de SQLite)
const registrarPago = (datos, callback) => {
    const { id_cuota, monto, metodo_pago } = datos;
    const fechaHoy = new Date().toISOString().split('T')[0];

    const sql1 = `INSERT INTO pagos (id_cuota, fecha_pago, monto_pagado, metodo_pago) VALUES ($1, $2, $3, $4)`;
    
    db.query(sql1, [id_cuota, fechaHoy, monto, metodo_pago], (err) => {
        if (err) {
            console.error("❌ Error al insertar pago:", err.message);
            return callback(err);
        }

        const sql2 = `UPDATE cuotas SET estado_pago = 'PAGADO' WHERE id_cuota = $1`;
        db.query(sql2, [id_cuota], callback);
    });
};

// 2. Obtener Reporte Mensual (¡AQUÍ ESTABA EL ERROR DE STRFTIME!)
const obtenerReporteMensual = (mes, anio, callback) => {
    // Cambiado p.monto_abonado por p.monto_pagado para que coincida con Supabase
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
        WHERE TO_CHAR(p.fecha_pago::TIMESTAMP, 'MM') = $1 
          AND TO_CHAR(p.fecha_pago::TIMESTAMP, 'YYYY') = $2
        ORDER BY p.fecha_pago DESC`;

    db.query(sql, [mes.padStart(2, '0'), anio.toString()], (err, res) => {
        if (err) {
            console.error("❌ ERROR CRÍTICO EN SQL DE REPORTES:", err.message);
            return callback(err);
        }
        callback(null, res.rows || []);
    });
};

// 3. Generar cuotas del mes actual de forma manual si es necesario
const generarMesActual = (callback) => {
    const m = new Date().getMonth() + 1;
    const a = new Date().getFullYear();
    
    // Convertido a Postgres: Se remueve INSERT OR IGNORE y se maneja con la lógica estándar
    const sql = `
        INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago)
        SELECT s.id_socio, $1, $2, cat.costo_mensual, 'PENDIENTE'
        FROM socios s 
        JOIN categorias cat ON s.id_categoria = cat.id_categoria
        WHERE s.estado = 'Activo'
          AND NOT EXISTS (
              SELECT 1 FROM cuotas c WHERE c.id_socio = s.id_socio AND c.mes = $1 AND c.anio = $2
          )
    `;
    
    db.query(sql, [m, a], (err, res) => {
        if (err) return callback(err);
        callback(null, res.rowCount); // rowCount nos dice cuántas filas se insertaron
    });
};

module.exports = { registrarPago, generarMesActual, obtenerReporteMensual };