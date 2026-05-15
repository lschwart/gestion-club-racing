const express = require('express');
const path = require('path');
const app = express();


// Importamos controladores
const sociosCtrl = require('./src/sociosController');
// Asegúrate de que este nombre sea el correcto según tu archivo de pagos
const pagosCtrl = require('./src/pagosController'); 

// Tareas programadas (Cron)
require('./src/tareasProgramadas');

// Configuración
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// --- RUTAS ---

// 1. Inicio (Dashboard + Tabla con Resumen)
app.get('/', (req, res) => {
    // 1. Obtenemos los socios (usando tu controlador que ya trae el resumen)
    sociosCtrl.listarConResumen((err, listaSocios) => {
        if (err) return res.status(500).send("Error al listar socios");

        // 2. Obtenemos las estadísticas
        sociosCtrl.obtenerEstadisticas((err, stats) => {
            const datosStats = stats || { total_activos: 0, recaudado: 0, pendiente: 0 };
   
            //3. Lógica para contar cumpleañeros hoy
            const hoy = new Date();
            const diaHoy = hoy.getDate();
            const mesHoy = hoy.getMonth() + 1;

            const cumpleañerosHoy = listaSocios.filter(s => {
                if (!s.fecha_nacimiento) return false;
                const f = new Date(s.fecha_nacimiento);
                // Ajuste de zona horaria si es necesario (+1 al día dependiendo de la carga)
                return (f.getUTCDate() === diaHoy && (f.getUTCMonth() + 1) === mesHoy);
            });    

             // 4. Obtenemos las categorías dinámicamente desde el controlador
            sociosCtrl.obtenerCategorias((err, listaCategorias) => {
                if (err) {
                    console.error("Error al traer categorías:", err);
                    listaCategorias = [];
                }

                // 5. Único renderizado con toda la información necesaria
                res.render('index', { 
                    socios: listaSocios, 
                    categorias: listaCategorias, 
                    stats: datosStats, // <-- Asegúrate de que esta coma esté ahí
                    cumpleHoy: cumpleañerosHoy.length // <-- Y que este nombre coincida con el del EJS
                });
            });
        });
    });
});

// 2. Ficha del Socio (Historial de pagos y deudas)
app.get('/socio/:id', (req, res) => {
    const idSocio = req.params.id;
    //console.log("🔍 Intentando cargar ficha del socio ID:", idSocio);

    sociosCtrl.buscarSocioCompleto(idSocio, (err, datosSocio) => {
        if (err) {
            console.error("❌ ERROR EN CONTROLADOR:", err);
            return res.status(500).send("Error interno: " + err.message);
        }
        
        if (!datosSocio) {
            console.log("⚠️ No se encontró el socio en la DB");
            return res.status(404).send("Socio no encontrado");
        }

        //console.log("✅ Datos recuperados para la vista:", datosSocio.nombre);
        
        // El error suele estar acá: si 'ficha' no existe o 'datosSocio' tiene algo raro
        try {
            res.render('ficha', { socio: datosSocio });
        } catch (errorRender) {
            console.error("❌ ERROR AL RENDERIZAR EJS:", errorRender);
            res.status(500).send("Error al dibujar la ficha: " + errorRender.message);
        }
    });
});

// 3. Registrar Pago
app.get('/pagar/:id_socio/:id_cuota', (req, res) => {
    const { id_socio, id_cuota } = req.params;
    // Ajusta estos parámetros según lo que espere tu función registrarPago
    pagosCtrl.registrarPago(id_socio, id_cuota, 'Transferencia Bancaria', (err) => {
        if (err) return res.status(500).send("Error al procesar el pago");
        res.redirect(`/socio/${id_socio}`);
    });
});

// 4. Alta de Nuevo Socio (Usando el controlador corregido)
app.post('/nuevo-socio', (req, res) => {
    const { nombre, apellido, dni, fecha_nacimiento, id_categoria } = req.body;
    
    // Preparamos el objeto con los datos para el controlador
    const datosNuevoSocio = {
        nombre,
        apellido,
        dni,
        fecha_nacimiento,
        id_categoria,
        estado: 'Activo'
    };

    // Llamamos a la función del controlador (asegúrate de haberla agregado a sociosController.js)
    sociosCtrl.crearSocio(datosNuevoSocio, (err) => {
        if (err) {
            console.error("Error al insertar socio:", err.message);
            return res.status(500).send("Error al insertar el socio.");
        }
        res.redirect('/');
    });
});

// Ruta para BAJA
app.get('/baja-socio/:id', (req, res) => {
    const id = req.params.id;
    // Usamos el controlador para que él maneje la base de datos
    sociosCtrl.cambiarEstado(id, 'Inactivo', (err) => {
        if (err) return res.status(500).send("Error al dar de baja");
        res.redirect('/');
    });
});

// Ruta para ALTA
app.get('/alta-socio/:id', (req, res) => {
    const id = req.params.id;
    sociosCtrl.cambiarEstado(id, 'Activo', (err) => {
        if (err) return res.status(500).send("Error al reactivar");
        res.redirect('/');
    });
});
// RUTA PARA REPORTES
app.get('/reportes', (req, res) => {
    // Tomamos el mes y año de la URL, o usamos el actual por defecto
    const hoy = new Date();
    const mes = req.query.mes || (hoy.getMonth() + 1).toString().padStart(2, '0');
    const anio = req.query.anio || hoy.getFullYear().toString();

    // Llamamos al controlador de pagos
    pagosCtrl.obtenerReporteMensual(mes, anio, (err, ingresos) => {
        if (err) {
            console.error("Error en reporte:", err);
            return res.status(500).send("Error al generar reporte");
        }

        // Calculamos el total sumando los montos de la lista
        const totalMes = ingresos.reduce((sum, p) => sum + p.monto_abonado, 0);

        res.render('reportes', {
            ingresos: ingresos,
            total: totalMes,
            mesSeleccionado: mes,
            anioSeleccionado: anio
        });
    });
});

// --- RUTA PARA PROCESAR EL PAGO ---
// --- RUTA PARA PROCESAR EL PAGO ---
app.post('/registrar-pago', (req, res) => {
    const { id_socio } = req.body;

    // Llamamos al controlador que ya tiene la conexión 'db'
    pagosCtrl.registrarPago(req.body, (err) => {
        if (err) {
            console.error("Error al registrar pago:", err);
            return res.status(500).send("Error al procesar el pago");
        }
        // Al terminar, volvemos a la ficha del socio
        res.redirect('/socio/' + id_socio);
    });
});

// --- ARCHIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, 'public')));

// Lanzamiento
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 CLUB RACING LTC- SISTEMA ACTIVO`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log("🚀 Servidor escuchando en http://localhost:3000");
    console.log(`-----------------------------------------`);
});
