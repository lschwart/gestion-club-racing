const express = require('express');
const path = require('path');
const fs = require('fs'); // Necesario para manejar carpetas
const sqlite3 = require('sqlite3'); // Asegúrate de que esté importado si lo usas aquí
const app = express();

// --- CONFIGURACIÓN DE LA BASE DE DATOS PARA LA NUBE ---
// Si existe la carpeta /app/data (Railway), la usamos. Si no, usamos la raíz.
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');

// Creamos la carpeta si no existe
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Esta ruta 'dbPath' es la que deberías pasarle a tus controladores 
// si ellos abren la conexión, o usarla aquí mismo.
const dbPath = path.join(dataDir, 'database.db');
// -------------------------------------------------------

// Importamos controladores
const sociosCtrl = require('./src/sociosController');
const pagosCtrl = require('./src/pagosController'); 

// Tareas programadas (Cron)
require('./src/tareasProgramadas');

// Configuración
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// --- RUTAS ---

// 1. Inicio (Dashboard + Tabla con Resumen)
app.get('/', (req, res) => {
    sociosCtrl.listarConResumen((err, listaSocios) => {
        if (err) return res.status(500).send("Error al listar socios");

        sociosCtrl.obtenerEstadisticas((err, stats) => {
            const datosStats = stats || { total_activos: 0, recaudado: 0, pendiente: 0 };
   
            const hoy = new Date();
            const diaHoy = hoy.getDate();
            const mesHoy = hoy.getMonth() + 1;

            const cumpleañerosHoy = listaSocios.filter(s => {
                if (!s.fecha_nacimiento) return false;
                const f = new Date(s.fecha_nacimiento);
                return (f.getUTCDate() === diaHoy && (f.getUTCMonth() + 1) === mesHoy);
            });    

            sociosCtrl.obtenerCategorias((err, listaCategorias) => {
                if (err) {
                    console.error("Error al traer categorías:", err);
                    listaCategorias = [];
                }

                res.render('index', { 
                    socios: listaSocios, 
                    categorias: listaCategorias, 
                    stats: datosStats,
                    cumpleHoy: cumpleañerosHoy.length
                });
            });
        });
    });
});

// 2. Ficha del Socio
app.get('/socio/:id', (req, res) => {
    const idSocio = req.params.id;
    sociosCtrl.buscarSocioCompleto(idSocio, (err, datosSocio) => {
        if (err) return res.status(500).send("Error interno: " + err.message);
        if (!datosSocio) return res.status(404).send("Socio no encontrado");

        try {
            res.render('ficha', { socio: datosSocio });
        } catch (errorRender) {
            res.status(500).send("Error al dibujar la ficha: " + errorRender.message);
        }
    });
});

// 3. Registrar Pago (GET)
app.get('/pagar/:id_socio/:id_cuota', (req, res) => {
    const { id_socio, id_cuota } = req.params;
    pagosCtrl.registrarPago(id_socio, id_cuota, 'Transferencia Bancaria', (err) => {
        if (err) return res.status(500).send("Error al procesar el pago");
        res.redirect(`/socio/${id_socio}`);
    });
});

// 4. Alta de Nuevo Socio
app.post('/nuevo-socio', (req, res) => {
    const { nombre, apellido, dni, fecha_nacimiento, id_categoria } = req.body;
    const datosNuevoSocio = { nombre, apellido, dni, fecha_nacimiento, id_categoria, estado: 'Activo' };

    sociosCtrl.crearSocio(datosNuevoSocio, (err) => {
        if (err) return res.status(500).send("Error al insertar el socio.");
        res.redirect('/');
    });
});

// Rutas de Estado (Baja/Alta)
app.get('/baja-socio/:id', (req, res) => {
    sociosCtrl.cambiarEstado(req.params.id, 'Inactivo', (err) => {
        if (err) return res.status(500).send("Error al dar de baja");
        res.redirect('/');
    });
});

app.get('/alta-socio/:id', (req, res) => {
    sociosCtrl.cambiarEstado(req.params.id, 'Activo', (err) => {
        if (err) return res.status(500).send("Error al reactivar");
        res.redirect('/');
    });
});

// Reportes
app.get('/reportes', (req, res) => {
    const hoy = new Date();
    const mes = req.query.mes || (hoy.getMonth() + 1).toString().padStart(2, '0');
    const anio = req.query.anio || hoy.getFullYear().toString();

    pagosCtrl.obtenerReporteMensual(mes, anio, (err, ingresos) => {
        if (err) return res.status(500).send("Error al generar reporte");
        const totalMes = ingresos.reduce((sum, p) => sum + p.monto_abonado, 0);
        res.render('reportes', {
            ingresos, total: totalMes, mesSeleccionado: mes, anioSeleccionado: anio
        });
    });
});

// Registrar Pago (POST)
app.post('/registrar-pago', (req, res) => {
    const { id_socio } = req.body;
    pagosCtrl.registrarPago(req.body, (err) => {
        if (err) return res.status(500).send("Error al procesar el pago");
        res.redirect('/socio/' + id_socio);
    });
});

// --- ARCHIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, 'public')));

// Lanzamiento
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 SISTEMA SAN CRISTOBAL LTC ACTIVO`);
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`📁 BD en: ${dbPath}`);
    console.log(`-----------------------------------------`);
});