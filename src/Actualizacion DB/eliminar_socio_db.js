const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const db = new sqlite3.Database('./database/socios.db');

// Configuración para leer la entrada del usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function mostrarMenu() {
    console.log(`
========================================
   SISTEMA DE GESTIÓN DE SOCIOS
========================================
1. 📊 Ver Dashboard
2. 👤 Registrar Nuevo Socio
3. 💰 Registrar un Pago
4. ❌ Eliminar un Socio
5. 🚪 Salir
========================================`);
    rl.question('Seleccione una opción: ', (opcion) => {
        manejarOpcion(opcion);
    });
}

function manejarOpcion(opcion) {
    switch (opcion) {
        case '1':
            verDashboard();
            break;
        case '2':
            // Aquí llamarías a tu lógica de insertar (simplificado para el ejemplo)
            console.log("\n[Función en construcción: Usa node src/index.js por ahora]");
            volverAlMenu();
            break;
        case '3':
            console.log("\n[Función en construcción: Usa node src/registrar_pago.js por ahora]");
            volverAlMenu();
            break;
        case '4':
            preguntarEliminar();
            break;
        case '5':
            console.log("¡Adiós!");
            db.close();
            rl.close();
            break;
        default:
            console.log("Opción no válida.");
            volverAlMenu();
            break;
    }
}

// --- FUNCIÓN PARA ELIMINAR SOCIO ---
function preguntarEliminar() {
    rl.question('\nIngrese el ID del socio que desea eliminar: ', (id) => {
        // Primero eliminamos sus cuotas y pagos por integridad referencial
        db.serialize(() => {
            db.run(`DELETE FROM pagos WHERE id_cuota IN (SELECT id_cuota FROM cuotas WHERE id_socio = ?)`, [id]);
            db.run(`DELETE FROM cuotas WHERE id_socio = ?`, [id]);
            db.run(`DELETE FROM socios WHERE id_socio = ?`, [id], function(err) {
                if (err) return console.error(err.message);
                console.log(`\n✅ Socio con ID ${id} y todos sus registros eliminados.`);
                volverAlMenu();
            });
        });
    });
}

// --- REUTILIZAMOS TU LÓGICA DE DASHBOARD ---
function verDashboard() {
    db.get(`SELECT COUNT(*) as total FROM socios WHERE estado = 'Activo'`, (err, row) => {
        console.log(`\n👤 Socios Activos: ${row.total}`);
        db.get(`SELECT SUM(monto_abonado) as recaudado FROM pagos`, (err, row) => {
            console.log(`💰 Recaudación Total: $${row.recaudado || 0}`);
            volverAlMenu();
        });
    });
}

function volverAlMenu() {
    setTimeout(mostrarMenu, 1000);
}

// Iniciar la app
mostrarMenu();