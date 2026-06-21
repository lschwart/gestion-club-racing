const express = require('express');
const path = require('path');
const app = express();

const session = require('express-session');

// Configuración de la sesión
app.use(session({
    secret: 'clave-secreta-club-san-cristobal', // Podés cambiar esto por cualquier texto largo
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // La sesión dura 24 horas activa
}));

// Middleware para proteger rutas
const requerirAutenticacion = (req, res, next) => {
    if (req.session && req.session.logueado) {
        return next(); // Está autorizado, continúa a la ruta
    }
    res.redirect('/login'); // No está autorizado, va al login
};


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

// --- RUTAS ---

// A. Vista del Login (Nueva)
app.get('/login', (req, res) => {
    res.render('login');
});

// B. Procesar el formulario de Login (Nueva)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Tomamos las credenciales de Railway (o usamos 'admin' y '12345' por defecto)
    const usuarioValido = process.env.ADMIN_USER || 'admin';
    const passwordValido = process.env.ADMIN_PASS || '12345';

    if (username === usuarioValido && password === passwordValido) {
        req.session.logueado = true;
        res.redirect('/');
    } else {
        res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }
});

// C. Ruta para cerrar sesión (Nueva y opcional)
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});


// 1. Inicio (Dashboard + Tabla con Resumen) - CON LOGS DE CONTROL
app.get('/', requerirAutenticacion, (req, res) => {
    console.log("=== 🔍 ENTRANDO A LA RUTA PRINCIPAL ===");
    
    sociosCtrl.listarConResumen((err, listaSocios) => {
        if (err) {
            console.error("❌ ERROR REAL en listarConResumen:", err);
            return res.status(500).send("Error al listar socios");
        }
        
        console.log("✅ Socios traídos con éxito. Cantidad:", listaSocios.length);

        sociosCtrl.obtenerEstadisticas((err, stats) => {
            if (err) {
                console.error("❌ ERROR REAL en obtenerEstadisticas:", err);
                return res.status(500).send("Error en estadísticas");
            }

            console.log("✅ Estadísticas traídas con éxito:", stats);
            
            try {
                const hoy = new Date();
                const diaHoy = hoy.getDate();
                const mesHoy = hoy.getMonth() + 1;

                const cumpleañerosHoy = listaSocios.filter(s => {
                    if (!s.fecha_nacimiento) return false;
                    const f = new Date(s.fecha_nacimiento);
                    return (f.getUTCDate() === diaHoy && (f.getUTCMonth() + 1) === mesHoy);
                });    

                console.log("✅ Lógica de cumpleaños completada sin trabas");

                sociosCtrl.obtenerCategorias((err, listaCategorias) => {
                    if (err) {
                        console.error("❌ ERROR REAL al traer categorías:", err);
                        listaCategorias = [];
                    }

                    console.log("🚀 Renderizando la vista index con todos los datos");
                    res.render('index', { 
                        socios: listaSocios, 
                        categorias: listaCategorias, 
                        stats: stats,
                        cumpleHoy: cumpleañerosHoy.length
                    });
                });
            } catch (errorLogico) {
                console.error("❌ EL CÓDIGO JAVASCRIPT EXPLOTÓ EN EL FILTRO:", errorLogico);
                res.status(500).send("Error interno del servidor en JS");
            }
        });
    });
});

// 2. Ficha del Socio (Historial de pagos y deudas) - PROTEGIDA
app.get('/socio/:id', requerirAutenticacion, (req, res) => {
    const idSocio = req.params.id;

    sociosCtrl.buscarSocioCompleto(idSocio, (err, datosSocio) => {
        if (err) {
            console.error("❌ ERROR EN CONTROLADOR:", err);
            return res.status(500).send("Error interno: " + err.message);
        }
        
        if (!datosSocio) {
            console.log("⚠️ No se encontró el socio en la DB");
            return res.status(404).send("Socio no encontrado");
        }
        
        try {
            res.render('ficha', { socio: datosSocio });
        } catch (errorRender) {
            console.error("❌ ERROR AL RENDERIZAR EJS:", errorRender);
            res.status(500).send("Error al dibujar la ficha: " + errorRender.message);
        }
    });
});

// 3. Registrar Pago (Acceso rápido por URL) - PROTEGIDA
app.get('/pagar/:id_socio/:id_cuota', requerirAutenticacion, (req, res) => {
    const { id_socio, id_cuota } = req.params;
    pagosCtrl.registrarPago(id_socio, id_cuota, 'Transferencia Bancaria', (err) => {
        if (err) return res.status(500).send("Error al procesar el pago");
        res.redirect(`/socio/${id_socio}`);
    });
});

// 4. Alta de Nuevo Socio - PROTEGIDA
app.post('/nuevo-socio', requerirAutenticacion, (req, res) => {
    const { nombre, apellido, dni, fecha_nacimiento, telefono, id_categoria } = req.body;
    
    const datosNuevoSocio = {
        nombre,
        apellido,
        dni,
        fecha_nacimiento,
        telefono,
        id_categoria,
        estado: 'Activo'
    };

// 3. Se lo mandamos a la función que modificamos recién
    sociosCtrl.crearSocio(datosNuevos, (err, idSocioNuevo) => {
        if (err) {
            console.error("❌ ERROR REAL al insertar en la DB:", err); // <-- Metemos este log por las dudas
            return res.status(500).send("Error al insertar el socio.");
        }
        res.redirect('/');
    });
});

// 5. Ruta para BAJA - PROTEGIDA
app.get('/baja-socio/:id', requerirAutenticacion, (req, res) => {
    const id = req.params.id;
    sociosCtrl.cambiarEstado(id, 'Inactivo', (err) => {
        if (err) return res.status(500).send("Error al dar de baja");
        res.redirect('/');
    });
});

// 6. Ruta para ALTA - PROTEGIDA
app.get('/alta-socio/:id', requerirAutenticacion, (req, res) => {
    const id = req.params.id;
    sociosCtrl.cambiarEstado(id, 'Activo', (err) => {
        if (err) return res.status(500).send("Error al reactivar");
        res.redirect('/');
    });
});

// 7. RUTA PARA REPORTES - PROTEGIDA
app.get('/reportes', requerirAutenticacion, (req, res) => {
    const hoy = new Date();
    const mes = req.query.mes || (hoy.getMonth() + 1).toString().padStart(2, '0');
    const anio = req.query.anio || hoy.getFullYear().toString();

    pagosCtrl.obtenerReporteMensual(mes, anio, (err, ingresos) => {
        if (err) {
            console.error("Error en reporte:", err);
            return res.status(500).send("Error al generar reporte");
        }

        const totalMes = ingresos.reduce((sum, p) => sum + parseFloat(p.monto_pagado || 0), 0);
        res.render('reportes', {
            ingresos: ingresos,
            total: totalMes,
            mesSeleccionado: mes,
            anioSeleccionado: anio
        });
    });
});

// 8. RUTA PARA PROCESAR EL PAGO DESDE FORMULARIO - PROTEGIDA
app.post('/registrar-pago', requerirAutenticacion, (req, res) => {
    const { id_socio } = req.body;

    pagosCtrl.registrarPago(req.body, (err) => {
        if (err) {
            console.error("Error al registrar pago:", err);
            return res.status(500).send("Error al procesar el pago");
        }
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