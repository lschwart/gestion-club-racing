const db = require('./database');

// 1. Listar socios (Para la página principal)
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
        if (err) {
            console.error("❌ Error en listarConResumen:", err.message);
            return callback(err);
        }
        // IMPORTANTE: En Postgres usamos res.rows
        callback(null, res.rows || []);
    });
};

// 2. Ficha del Socio
const buscarSocioConDeudas = (id, callback) => {
    const sqlSocio = `
        SELECT s.*, c.nombre_categoria, c.costo_mensual 
        FROM socios s
        JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE s.id_socio = $1
    `;
    
    db.query(sqlSocio, [id], (err, resSocio) => {
        if (err) return callback(err);
        const socio = resSocio.rows ? resSocio.rows[0] : null;
        
        if (!socio) return callback(null, null);

        const sqlCuotas = `SELECT * FROM cuotas WHERE id_socio = $1 ORDER BY anio DESC, mes DESC`;
        db.query(sqlCuotas, [id], (err, resCuotas) => {
            if (err) return callback(err);
            socio.cuotas = resCuotas.rows || [];
            callback(null, socio);
        });
    });
};

// 3. Crear Socio y su Cuota
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
            if (err || !resCat.rows[0]) return callback(null, idSocioNuevo);

            const monto = resCat.rows[0].costo_mensual;
            const fecha = new Date();
            const mes = fecha.getMonth() + 1;
            const anio = fecha.getFullYear();
            
            const sqlCuota = `
                INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago) 
                VALUES ($1, $2, $3, $4, 'PENDIENTE')
            `;

            db.query(sqlCuota, [idSocioNuevo, mes, anio, monto], (err) => {
                // Siempre llamamos al callback para que la web no se cuelgue
                callback(null, idSocioNuevo); 
            });
        });
    });
};

// 4. Funciones para el Servidor (Categorías y Dashboard)
const obtenerCategorias = (callback) => {
    db.query("SELECT * FROM categorias ORDER BY nombre_categoria ASC", [], (err, res) => {
        if (err) return callback(err);
        callback(null, res.rows || []);
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
        callback(null, res.rows ? res.rows[0] : { total_socios: 0, deuda_total: 0 });
    });
};

module.exports = {
    listarConResumen,
    buscarSocioConDeudas,
    crearSocio,
    obtenerCategorias,
    obtenerEstadisticas
};