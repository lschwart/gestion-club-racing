const readline = require('readline');
const sociosCtrl = require('./sociosController');
const pagosCtrl = require('./pagosController');

const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
});

function mostrarMenu() {
    console.log(`
========================================
   SISTEMA DE GESTIÓN DE SOCIOS
========================================
1. 📊 Ver Dashboard y Lista
2. 👤 Registrar Nuevo Socio
3. 💰 Registrar un Pago
4. 🔍 Buscar Socio (Ver Deudas)
5. ⏸️ Dar de Baja (Inactivar)
6. 📅 Generar Cuotas del Mes
7. 📂 Exportar Socios Activos (Excel/CSV)");
8. 🚪 Salir");
========================================`);
    rl.question('Seleccione una opción: ', (opcion) => {
        manejarOpcion(opcion);
    });
}

function manejarOpcion(opcion) {
    switch (opcion) {
        case '1':
            sociosCtrl.listarConResumen((err, filas) => {
                if (err) console.log("❌ Error:", err.message);
                else console.table(filas);
                volverAlMenu();
            });
            break;
        case '2':
            menuNuevoSocio();
            break;
        case '3':
            opcionCobrar();
            break;
        case '4':
            opcionBuscarSocio();
            break;
        case '5':
            menuBajaSocio();
            break;
        case '6':
            pagosCtrl.generarMesActual((err, cambios) => {
                if (err) console.log("❌ Error:", err.message);
                else console.log(`✅ Se generaron ${cambios} nuevas cuotas.`);
                volverAlMenu();
            });
            break;
        case '7':
            sociosCtrl.exportarActivosCSV((err, nombreArchivo) => {
                if (err) console.log("❌ Error al exportar:", err.message);
                else console.log(`\n✅ Archivo "${nombreArchivo}" creado con éxito en la carpeta del proyecto.`);
                volverAlMenu();
            });
            break;
        case '8':
            console.log("¡Hasta luego!");
            process.exit();
            break;
        default:
            console.log("Opción no válida.");
            volverAlMenu();
            break;
    }
}

// --- FUNCIONES DE APOYO ---

function menuNuevoSocio() {
    rl.question('Nombre: ', (nom) => {
        rl.question('Apellido: ', (ape) => {
            rl.question('DNI: ', (dni) => {
                sociosCtrl.registrarSocio(nom, ape, dni, (err, id) => {
                    if (err) console.log("❌ Error:", err.message);
                    else console.log(`✅ Socio creado con ID: ${id}`);
                    volverAlMenu();
                });
            });
        });
    });
}

function opcionBuscarSocio() {
    rl.question('\nIngrese ID del socio: ', (id) => {
        sociosCtrl.buscarSocioConDeudas(id, (err, socio) => {
            if (err) return console.log("❌ Error:", err.message);
            if (!socio) return console.log("🔍 Socio no encontrado.");

            console.log(`\n👤 ${socio.nombre} ${socio.apellido} | Estado: ${socio.estado}`);
            if (socio.deudas.length > 0) {
                console.log("🚩 DEUDAS:");
                socio.deudas.forEach(d => console.log(`   - ${d.periodo}: $${d.monto}`));
            } else {
                console.log("✅ Sin deudas.");
            }
            volverAlMenu();
        });
    });
}

function opcionCobrar() {
    rl.question('ID Socio: ', (id) => {
        rl.question('Mes (1-12): ', (m) => {
            rl.question('Metodo: ', (met) => {
                pagosCtrl.registrarPago(id, m, 2026, met, (err, monto) => {
                    if (err) console.log("❌ Error:", err.message);
                    else console.log(`✅ ¡Cobrado $${monto}!`);
                    volverAlMenu();
                });
            });
        });
    });
}

function menuBajaSocio() {
    rl.question('ID del socio a inactivar: ', (id) => {
        sociosCtrl.cambiarEstado(id, 'Inactivo', (err) => {
            if (err) console.log("❌ Error:", err.message);
            else console.log("✅ Socio inactivado correctamente.");
            volverAlMenu();
        });
    });
}

function volverAlMenu() {
    setTimeout(mostrarMenu, 500);
}

// Arrancar
mostrarMenu(); 