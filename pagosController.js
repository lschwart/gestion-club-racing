const path = require('path');
// Esta línea detecta si estamos en Railway o en tu PC
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.db');

const db = new sqlite3.Database(dbPath);

// Esta es la función que usará tu formulario de la ficha
const registrarPago = (datos, callback) => {
    const { id_cuota, monto, metodo_pago } = datos;
    const fechaHoy = new Date().toISOString().split('T')[0];

    db.serialize(() => {
        const sql1 = `INSERT INTO pagos (id_cuota, fecha_pago, monto_abonado, metodo_pago) VALUES (?, ?, ?, ?)`;
        db.run(sql1, [id_cuota, fechaHoy, monto, metodo_pago], (err) => {
            if (err) return callback(err);

            const sql2 = `UPDATE cuotas SET estado_pago = 'Pagado' WHERE id_cuota = ?`;
            db.run(sql2, [id_cuota], callback);
        });
    });
};

const obtenerReporteMensual = (mes, anio, callback) => {
    const sql = `
        SELECT p.fecha_pago, p.monto_abonado, p.metodo_pago, s.nombre, s.apellido, c.nombre_categoria
        FROM pagos p
        JOIN cuotas cu ON p.id_cuota = cu.id_cuota
        JOIN socios s ON cu.id_socio = s.id_socio
        JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE strftime('%m', p.fecha_pago) = ? 
          AND strftime('%Y', p.fecha_pago) = ?
        ORDER BY p.fecha_pago DESC`;

    db.all(sql, [mes.padStart(2, '0'), anio.toString()], (err, rows) => {
        callback(err, rows);
    });
};

const generarMesActual = (callback) => {
    const m = new Date().getMonth() + 1;
    const a = new Date().getFullYear();
    const sql = `INSERT OR IGNORE INTO cuotas (id_socio, mes, anio, monto_original, estado_pago)
                 SELECT s.id_socio, ?, ?, cat.costo_mensual, 'PENDIENTE'
                 FROM socios s JOIN categorias cat ON s.id_categoria = cat.id_categoria
                 WHERE s.estado = 'Activo'`;
    db.run(sql, [m, a], function(err) {
        callback(err, this.changes);
    });
};

module.exports = { registrarPago, generarMesActual, obtenerReporteMensual };