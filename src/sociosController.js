const fs = require('fs'); // Módulo para manejar archivos
const db = require('./database');

// 1. Listar todos los socios
const listarConResumen = (callback) => {
    // Usamos IFNULL para que si la deuda es vacía, nos devuelva 0 y no rompa nada
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
            (SELECT IFNULL(SUM(monto_original), 0) FROM cuotas WHERE id_socio = s.id_socio AND estado_pago = 'PENDIENTE') AS deuda_total
        FROM socios s
        JOIN categorias c ON s.id_categoria = c.id_categoria
    `;

    db.all(sql, [], (err, filas) => {
        if (err) {
            console.error("DETALLE DEL ERROR SQL:", err.message); // Esto nos dirá qué falló exactamente
            return callback(err);
        }
        callback(null, filas);
    });
};

// 2. Buscar socio y ver sus deudas (La función que daba error)
const buscarSocioConDeudas = (id, callback) => {
// 1. Buscamos los datos básicos del socio
    const sqlSocio = "SELECT * FROM socios WHERE id_socio = ?";
        //if (err || !socio) return callback(err);
        db.get(sqlSocio, [id], (err, socio) => {
        if (err) return callback(err);
        if (!socio) return callback(null, null);

        // 2. Buscamos sus cuotas pendientes
        db.all("SELECT * FROM cuotas WHERE id_socio = ? AND estado_pago = 'PENDIENTE'", [id], (err, deudas) => {
            if (err) return callback(err);

            // 3. Buscamos sus pagos realizados (HISTORIAL)
            db.all("SELECT * FROM pagos WHERE id_socio = ? ORDER BY fecha_pago DESC", [id], (err, historial) => {
                if (err) return callback(err);

                // Armamos el objeto completo para la ficha
                const datosSocio = {
                    id: socio.id_socio,
                    nombre: socio.nombre,
                    apellido: socio.apellido,
                    estado: socio.estado,
                    deudas: deudas.map(d => ({ periodo: `${d.mes}/${d.anio}`, monto: d.monto_original })),
                    pagos: historial // Aquí van los pagos realizados
                };
                callback(null, datosSocio);
            });
        });
    });
};

// 3. Cambiar estado (Baja/Alta)
const cambiarEstado = (id, nuevoEstado, callback) => {
    db.run(`UPDATE socios SET estado = ? WHERE id_socio = ?`, [nuevoEstado, id], callback);
};


const buscarSocioCompleto = (id, callback) => {
    // 1. Buscamos los datos básicos del socio
    const sqlSocio = "SELECT * FROM socios WHERE id_socio = ?";
    
    db.get(sqlSocio, [id], (err, socio) => {
        if (err) return callback(err);
        if (!socio) return callback(null, null);

        // 2. Traemos TODAS las cuotas (tanto pagadas como pendientes)
        // Esto es lo que espera tu ficha.ejs para armar la tabla
        const sqlCuotas = `
            SELECT 
                c.id_cuota,
                c.mes, 
                c.anio, 
                c.monto_original as monto, 
                c.estado_pago,
                p.fecha_pago
            FROM cuotas c
            LEFT JOIN pagos p ON c.id_cuota = p.id_cuota
            WHERE c.id_socio = ?
            ORDER BY c.anio DESC, c.mes DESC`;
        
        db.all(sqlCuotas, [id], (err, todasLasCuotas) => {
            if (err) return callback(err);

            // Armamos el objeto con la estructura que la FICHA ya conoce
            const resultado = {
                id_socio: socio.id_socio, // Usá el nombre completo
                nombre: socio.nombre,
                apellido: socio.apellido,
                dni: socio.dni,
                estado: socio.estado,
                fecha_nacimiento: socio.fecha_nacimiento,
                cuotas: todasLasCuotas 
            };

            callback(null, resultado);
        });
    });
};


// 4. Controlador de Estadísticas
const obtenerEstadisticas = (callback) => {
    //console.log("intentando ejecutar obtenerEstadisticas..."); // NUEVO CHIVATO

    // Tres consultas simples
    const sql1 = "SELECT COUNT(*) as total FROM socios WHERE estado = 'Activo'";
    const sql2 = "SELECT SUM(monto_abonado) as total FROM pagos";
    const sql3 = "SELECT SUM(monto_original) as total FROM cuotas WHERE estado_pago = 'PENDIENTE'";

    db.get(sql1, [], (err, res1) => {
        if (err) return callback(err);
        
        db.get(sql2, [], (err, res2) => {
            if (err) return callback(err);

            db.get(sql3, [], (err, res3) => {
                if (err) return callback(err);

                const resultados = {
                    total_activos: res1?.total || 0,
                    recaudado: res2?.total || 0,
                    pendiente: res3?.total || 0
                };

                //console.log("📊 RESULTADOS FINALES:", resultados); // ESTO TIENE QUE SALIR
                callback(null, resultados);
            });
        });
    });
};

//5. Función para obtener categorías dinámicamente
const obtenerCategorias = (callback) => {
    const sql = "SELECT * FROM categorias";
    db.all(sql, [], (err, rows) => {
        callback(err, rows);
    });
};

//6. Función para insertar un nuevo socio
const crearSocio = (datos, callback) => {
    const { nombre, apellido, dni, fecha_nacimiento, id_categoria, estado } = datos;
    
    // 1. Insertamos el socio
    const sqlSocio = `INSERT INTO socios (nombre, apellido, dni, fecha_nacimiento, id_categoria, estado) 
                      VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sqlSocio, [nombre, apellido, dni, fecha_nacimiento, id_categoria, estado], function(err) {
        if (err) return callback(err);

        const idSocioNuevo = this.lastID;

        // 2. Buscamos el monto de la categoría
        const sqlMonto = "SELECT costo_mensual FROM categorias WHERE id_categoria = ?";
        db.get(sqlMonto, [id_categoria], (err, categoria) => {
            if (err) return callback(err);

            // 3. Obtenemos mes y año por separado
            const fechaActual = new Date();
            const mesActual = fechaActual.getMonth() + 1; // Enero es 0, por eso +1
            const anioActual = fechaActual.getFullYear();
            
            // 4. Insertamos en la tabla cuotas respetando tus campos 'mes' y 'anio'
            // Ajusté los nombres de las columnas a 'mes' y 'anio' (o 'year') según tu tabla
            const sqlCuota = `INSERT INTO cuotas (id_socio, mes, anio, monto_original, estado_pago) 
                              VALUES (?, ?, ?, ?, 'PENDIENTE')`;

            db.run(sqlCuota, [idSocioNuevo, mesActual, anioActual, categoria.costo_mensual], (err) => {
                if (err) return callback(err);
                
                console.log(`✅ Socio creado: ID ${idSocioNuevo} - Cuota: ${mesActual}/${anioActual}`);
                callback(null, idSocioNuevo);
            });
        });
    });
};

// IMPORTANTE: Exportar todas las funciones
module.exports = {
    listarConResumen,
    buscarSocioConDeudas,
    cambiarEstado,
    buscarSocioCompleto,
    obtenerEstadisticas,
    obtenerCategorias,
    crearSocio,
};
