const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

function mostrarDashboard() {
    console.log("\n========================================");
    console.log("   SISTEMA DE GESTIÓN ");
    console.log("========================================\n");

    db.serialize(() => {
        // 1. Total de socios activos
        db.get(`SELECT COUNT(*) as total FROM socios WHERE estado = 'Activo'`, (err, row) => {
            console.log(`👤 Total Socios Activos: ${row.total}`);
        });

        // 2. Total de dinero recaudado en el mes actual (Marzo 2026)
        // Buscamos en la tabla de pagos, filtrando por la fecha de hoy
        const mesActual = '2026-03'; 
        db.get(`SELECT SUM(monto_abonado) as recaudado FROM pagos WHERE fecha_pago LIKE '${mesActual}%'`, (err, row) => {
            const total = row.recaudado || 0;
            console.log(`💰 Recaudación del Mes: $${total.toFixed(2)}`);
            console.log("----------------------------------------");
        });

        // 3. Lista de socios que aún deben (Pendientes)
        console.log("🚩 SOCIOS CON DEUDA PENDIENTE:");
        const sqlDeudores = `
            SELECT s.nombre, s.apellido, c.mes, c.anio, cat.costo_mensual
            FROM socios s
            JOIN cuotas c ON s.id_socio = c.id_socio
            JOIN categorias cat ON s.id_categoria = cat.id_categoria
            WHERE c.estado_pago = 'PENDIENTE'
        `;

        db.all(sqlDeudores, [], (err, filas) => {
            if (err) return console.error(err.message);

            if (filas.length === 0) {
                console.log("   ✅ No hay deudores. ¡Todo al día!");
            } else {
                filas.forEach((f) => {
                    console.log(`   ❌ ${f.nombre} ${f.apellido} (${f.mes}/${f.anio}): $${f.costo_mensual}`);
                });
            }
            console.log("\n========================================\n");
        });
    });
}

mostrarDashboard();