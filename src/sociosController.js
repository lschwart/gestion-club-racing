const db = require('./database');

// 1. LISTAR (Para el index)
const listarConResumen = (callback) => {
    const sql = `
        SELECT s.id_socio, s.nombre, s.apellido, s.dni, s.estado, s.fecha_nacimiento, c.nombre_categoria,
        (SELECT COUNT(*) FROM cuotas WHERE id_socio = s.id_socio AND estado_pago = 'PENDIENTE') AS cuotas_pendientes,
        (SELECT COALESCE(SUM(monto), 0) FROM cuotas WHERE id_socio = s.id_socio AND estado_pago = 'PENDIENTE') AS deuda_total
        FROM socios s JOIN categorias c ON s.id_categoria = c.id_categoria ORDER BY s.apellido ASC`;
    db.query(sql, [], (err, res) => {
        if (err) return callback(err);
        callback(null, res.rows || []);
    });
};

// 2. FICHA (Cambiamos el nombre para que coincida con tu server.js)
const buscarSocioCompleto = (id, callback) => {
    const sqlSocio = `SELECT s.*, c.nombre_categoria FROM socios s JOIN categorias c ON s.id_categoria = c.id_categoria WHERE s.id_socio = $1`;
    db.query(sqlSocio, [id], (err, resSocio) => {
        if (err) return callback(err);
        const socio = resSocio.rows[0];
        if (!socio) return callback(null, null);

        db.query(`SELECT * FROM cuotas WHERE id_socio = $1 ORDER BY anio DESC, mes DESC`, [id], (err, resCuotas) => {
            if (err) return callback(err);
            socio.cuotas = resCuotas.rows || [];
            callback(null, socio);
        });
    });
};

// 3. CREAR SOCIO
// 3. CREAR SOCIO (CON CAMPO TELÉFONO INTEGRADO)
const crearSocio = (datos, callback) => {
    // 1. Agregamos "telefono" a los datos que extraemos del formulario
    const { nombre, apellido, dni, id_categoria, fecha_nacimiento, telefono } = datos;
    
    // 2. Modificamos el INSERT para incluir la columna telefono y el parámetro $6
    const sqlSocio = `INSERT INTO socios (nombre, apellido, dni, id_categoria, fecha_nacimiento, telefono, estado) VALUES ($1, $2, $3, $4, $5, $6, 'Activo') RETURNING id_socio`;
    
    // 3. Sumamos "telefono" al final del arreglo de valores correspondientes al $6
    db.query(sqlSocio, [nombre, apellido, dni, id_categoria, fecha_nacimiento, telefono], (err, res) => {
        if (err) return callback(err);
        const idSocioNuevo = res.rows[0].id_socio;

        db.query("SELECT costo_mensual FROM categorias WHERE id_categoria = $1", [id_categoria], (err, resCat) => {
            const monto = (!err && resCat.rows[0]) ? resCat.rows[0].costo_mensual : 0;
            const hoy = new Date();
            db.query(`INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago) VALUES ($1, $2, $3, $4, 'PENDIENTE')`, 
            [idSocioNuevo, hoy.getMonth()+1, hoy.getFullYear(), monto], () => {
                callback(null, idSocioNuevo);
            });
        });
    });
};

// 4. CAMBIAR ESTADO (Baja/Alta) - Esta te faltaba para que no de error
const cambiarEstado = (id, estado, callback) => {
    db.query("UPDATE socios SET estado = $1 WHERE id_socio = $2", [estado, id], (err) => {
        callback(err);
    });
};

// 5. SOPORTE
const obtenerCategorias = (callback) => {
    db.query("SELECT * FROM categorias ORDER BY nombre_categoria ASC", [], (err, res) => {
        callback(err, res ? res.rows : []);
    });
};

const obtenerEstadisticas = (callback) => {
    // 1. Contamos socios activos
    // 2. Sumamos monto_pagado de la tabla pagos (Recaudado Total histórico o del mes, según prefieras)
    // 3. Sumamos lo pendiente de la tabla cuotas
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM socios WHERE estado = 'Activo') as total_activos, 
            (SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos) as recaudado,
            (SELECT COALESCE(SUM(monto), 0) FROM cuotas WHERE estado_pago = 'PENDIENTE') as pendiente`;
            
    db.query(sql, [], (err, res) => {
        if (err) {
            console.error("❌ Error en obtenerEstadisticas SQL:", err.message);
            return callback(err);
        }
        // Retornamos el primer registro con formato numérico correcto
        const stats = res.rows[0] || { total_activos: 0, recaudado: 0, pendiente: 0 };
        
        // Convertimos a número real para evitar textos en el render
        stats.total_activos = parseInt(stats.total_activos);
        stats.recaudado = parseFloat(stats.recaudado);
        stats.pendiente = parseFloat(stats.pendiente);
        
        callback(null, stats);
    });
};

module.exports = { listarConResumen, buscarSocioCompleto, crearSocio, cambiarEstado, obtenerCategorias, obtenerEstadisticas };