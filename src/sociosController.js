const fs = require('fs'); 
const db = require('./database');

// 1. Listar todos los socios
const listarConResumen = (callback) => {
    // CAMBIOS: 
    // - IFNULL -> COALESCE
    // - monto_original -> monto (según el nuevo SQL que ejecutamos)
    const sql = `
        SELECT 
            s.id_socio, 
            s.nombre, 
            s.apellido, 
            s.dni, 
            s.estado,
            s.fecha_nacimiento, 
            c.nombre_categoria,
            (SELECT COUNT(*) FROM cuotas WHERE id_socio = s.id_socio AND estado_pago = 'PENDIENTE') AS cuotas_pendientes,
            (SELECT COALESCE(SUM(monto), 0) FROM cuotas WHERE id_socio = s.id_socio AND estado_pago = 'PENDIENTE') AS deuda_total
        FROM socios s
        JOIN categorias c ON s.id_categoria = c.id_categoria
        ORDER BY s.apellido ASC
    `;

    db.all(sql, [], (err, filas) => {
        if (err) {
            console.error("DETALLE DEL ERROR SQL EN LISTAR:", err.message);
            return callback(err);
        }
        callback(null, filas);
    });
};

// 2. Buscar socio y ver sus deudas
const buscarSocioConDeudas = (id, callback) => {
    // CAMBIOS: ? -> $1 (aunque el adaptador lo traduce, es mejor dejarlo nativo)
    const sqlSocio = `
        SELECT s.*, c.nombre_categoria, c.costo_mensual 
        FROM socios s
        JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE s.id_socio = $1
    `;
    
    db.get(sqlSocio, [id], (err, socio) => {
        if (err) return callback(err);
        if (!socio) return callback(null, null);

        const sqlCuotas = `SELECT * FROM cuotas WHERE id_socio = $1 ORDER BY anio DESC, mes DESC`;
        db.all(sqlCuotas, [id], (err, cuotas) => {
            if (err) return callback(err);
            socio.cuotas = cuotas;
            callback(null, socio);
        });
    });
};

// 3. Crear un nuevo socio y su primera cuota
const crearSocio = (datos, callback) => {
    const { nombre, apellido, dni, id_categoria, fecha_nacimiento } = datos;

    // CAMBIOS: Usamos RETURNING para obtener el ID en Postgres
    const sqlSocio = `
        INSERT INTO socios (nombre, apellido, dni, id_categoria, fecha_nacimiento, estado) 
        VALUES ($1, $2, $3, $4, $5, 'Activo') 
        RETURNING id_socio
    `;

    // Usamos db.query directamente para aprovechar el RETURNING
    db.query(sqlSocio, [nombre, apellido, dni, id_categoria, fecha_nacimiento], (err, res) => {
        if (err) {
            console.error("ERROR AL CREAR SOCIO:", err.message);
            return callback(err);
        }

        const idSocioNuevo = res.rows[0].id_socio;

        // 2. Buscamos el monto de la categoría
        const sqlMonto = "SELECT costo_mensual FROM categorias WHERE id_categoria = $1";
        db.get(sqlMonto, [id_categoria], (err, categoria) => {
            if (err) return callback(err);

            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth() + 1;
            const anioActual = fechaActual.getFullYear();
            
            // CAMBIOS: monto_original -> monto
            const sqlCuota = `
                INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago) 
                VALUES ($1, $2, $3, $4, 'PENDIENTE')
            `;

            db.run(sqlCuota, [idSocioNuevo, mesActual, anioActual, categoria.costo_mensual], (err) => {
                if (err) return callback(err);
                
                console.log(`✅ Socio creado exitosamente: ID ${idSocioNuevo}`);
                callback(null, idSocioNuevo);
            });
        });
    });
};

// Función para el Dashboard de la web (Estadísticas)
const obtenerEstadisticas = (callback) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM socios WHERE estado = 'Activo') as total_socios,
            (SELECT COALESCE(SUM(monto), 0) FROM cuotas WHERE estado_pago = 'PENDIENTE') as deuda_total,
            (SELECT COUNT(*) FROM socios WHERE id_categoria = (SELECT id_categoria FROM categorias WHERE nombre_categoria = 'Socio Pleno' LIMIT 1)) as socios_plenos
    `;
    
    db.get(sql, [], (err, fila) => {
        if (err) return callback(err);
        callback(null, fila);
    });
};

module.exports = {
    listarConResumen,
    buscarSocioConDeudas,
    crearSocio,
    obtenerEstadisticas
};