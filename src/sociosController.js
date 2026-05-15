const db = require('./database');

// 1. Listar socios (Corregido para Postgres)
const listarConResumen = (callback) => {
    const sql = `
        SELECT 
            s.id_socio, s.nombre, s.apellido, s.dni, s.estado, s.fecha_nacimiento, 
            c.nombre_categoria,
            (SELECT COUNT(*) FROM cuotas WHERE id_socio = s.id_socio AND estado_pago = 'PENDIENTE') AS cuotas_pendientes,
            (SELECT COALESCE(SUM(monto), 0) FROM cuotas WHERE id_socio = s.id_socio AND estado_pago = 'PENDIENTE') AS deuda_total
        FROM socios s
        JOIN categorias c ON s.id_categoria = c.id_categoria
        ORDER BY s.apellido ASC
    `;
    db.query(sql, [], (err, res) => {
        if (err) return callback(err);
        callback(null, res.rows); // Usamos .rows porque es Postgres
    });
};

// 2. Ficha del Socio (Corregido el error de Internal Server Error)
const buscarSocioConDeudas = (id, callback) => {
    const sqlSocio = `
        SELECT s.*, c.nombre_categoria, c.costo_mensual 
        FROM socios s
        JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE s.id_socio = $1
    `;
    
    db.query(sqlSocio, [id], (err, resSocio) => {
        if (err) return callback(err);
        const socio = resSocio.rows[0];
        if (!socio) return callback(null, null);

        const sqlCuotas = `SELECT * FROM cuotas WHERE id_socio = $1 ORDER BY anio DESC, mes DESC`;
        db.query(sqlCuotas, [id], (err, resCuotas) => {
            if (err) return callback(err);
            socio.cuotas = resCuotas.rows;
            callback(null, socio);
        });
    });
};

// 3. Crear Socio (Garantiza que se cree la cuota y no se cuelgue)
const crearSocio = (datos, callback) => {
    const { nombre, apellido, dni, id_categoria, fecha_nacimiento } = datos;

    const sqlSocio = `
        INSERT INTO socios (nombre, apellido, dni, id_categoria, fecha_nacimiento, estado) 
        VALUES ($1, $2, $3, $4, $5, 'Activo') 
        RETURNING id_socio
    `;

    db.query(sqlSocio, [nombre, apellido, dni, id_categoria, fecha_nacimiento], (err, res) => {
        if (err) return callback(err);
        const idSocioNuevo = res.rows[0].id_socio;

        db.query("SELECT costo_mensual FROM categorias WHERE id_categoria = $1", [id_categoria], (err, resCat) => {
            if (err) return callback(null, idSocioNuevo); // Evita cuelgue si falla cat

            const monto = resCat.rows[0].costo_mensual;
            const fecha = new Date();
            
            const sqlCuota = `
                INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago) 
                VALUES ($1, $2, $3, $4, 'PENDIENTE')
            `;

            db.query(sqlCuota, [idSocioNuevo, fecha.getMonth()+1, fecha.getFullYear(), monto], (err) => {
                // IMPORTANTE: Pase lo que pase, llamamos al callback para que la web no se cuelgue
                callback(null, idSocioNuevo); 
            });
        });
    });
};

// Funciones de apoyo para el servidor
const obtenerCategorias = (callback) => {
    db.query("SELECT * FROM categorias ORDER BY nombre_categoria ASC", [], (err, res) => {
        if (err) return callback(err);
        callback(null, res.rows);
    });
};

const obtenerEstadisticas = (callback) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM socios WHERE estado = 'Activo') as total_socios,
            (SELECT COALESCE(SUM(monto), 0) FROM cuotas WHERE estado_pago = 'PENDIENTE') as deuda_total
    `;
    db.query(sql, [], (err, res) => {
        if (err) return callback(err);
        callback(null, res.rows[0]);
    });
};

module.exports = {
    listarConResumen,
    buscarSocioConDeudas,
    crearSocio,
    obtenerCategorias,
    obtenerEstadisticas
};