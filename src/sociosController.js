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

    // 1. Insertamos el socio
    const sqlSocio = `
        INSERT INTO socios (nombre, apellido, dni, id_categoria, fecha_nacimiento, estado) 
        VALUES ($1, $2, $3, $4, $5, 'Activo') 
        RETURNING id_socio
    `;

    db.query(sqlSocio, [nombre, apellido, dni, id_categoria, fecha_nacimiento], (err, res) => {
        if (err) {
            console.error("❌ ERROR AL CREAR SOCIO:", err.message);
            return callback(err);
        }

        const idSocioNuevo = res.rows[0].id_socio;

        // 2. Buscamos el monto de la categoría para asignarle a la cuota
        const sqlMonto = "SELECT costo_mensual FROM categorias WHERE id_categoria = $1";
        
        db.query(sqlMonto, [id_categoria], (err, resCat) => {
            if (err || !resCat.rows[0]) {
                console.error("❌ ERROR AL BUSCAR CATEGORÍA:", err ? err.message : "No encontrada");
                // Si falla la categoría, igual avisamos que el socio se creó
                return callback(null, idSocioNuevo); 
            }

            const montoCategoria = resCat.rows[0].costo_mensual;
            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth() + 1;
            const anioActual = fechaActual.getFullYear();
            
            // 3. Insertamos la cuota inicial como 'PENDIENTE'
            // IMPORTANTE: Aquí forzamos que diga PENDIENTE
            const sqlCuota = `
                INSERT INTO cuotas (id_socio, mes, anio, monto, estado_pago) 
                VALUES ($1, $2, $3, $4, 'PENDIENTE')
            `;

            db.query(sqlCuota, [idSocioNuevo, mesActual, anioActual, montoCategoria], (err) => {
                if (err) {
                    console.error("❌ ERROR AL CREAR CUOTA INICIAL:", err.message);
                    // Si falla la cuota, igual devolvemos el socio para que no se cuelgue la web
                    return callback(null, idSocioNuevo);
                }
                
                console.log(`✅ Socio ${idSocioNuevo} creado con cuota ${mesActual}/${anioActual} PENDIENTE.`);
                
                // ESTE ES EL AVISO PARA QUE LA WEB DEJE DE GIRAR
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

// Función para obtener las categorías (necesaria para los formularios)
const obtenerCategorias = (callback) => {
    const sql = "SELECT * FROM categorias ORDER BY nombre_categoria ASC";
    db.all(sql, [], (err, filas) => {
        if (err) return callback(err);
        callback(null, filas);
    });
};

// Función para obtener un socio por ID (sin deudas, solo datos básicos)
const obtenerSocioPorId = (id, callback) => {
    const sql = "SELECT * FROM socios WHERE id_socio = $1";
    db.get(sql, [id], (err, fila) => {
        if (err) return callback(err);
        callback(null, fila);
    });
};

module.exports = {
    listarConResumen,
    buscarSocioConDeudas,
    crearSocio,
    obtenerEstadisticas,
    obtenerCategorias,
    obtenerSocioPorId
};