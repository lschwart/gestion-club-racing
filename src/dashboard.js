const db = require('./database'); // Cambiamos la conexión local por la de Supabase

function mostrarDashboard() {
    console.log("\n========================================");
    console.log("   SISTEMA DE GESTIÓN - SAN CRISTÓBAL");
    console.log("========================================\n");

    // 1. Total de socios activos
    db.get(`SELECT COUNT(*) as total FROM socios WHERE estado = 'Activo'`, [], (err, row) => {
        if (err) return console.error("Error en total socios:", err.message);
        console.log(`👤 Total Socios Activos: ${row.total}`);
    });

    // 2. Total de dinero recaudado en el mes actual
    // CAMBIO: En Postgres no usamos LIKE con fechas. Usamos EXTRACT.
    // Además usamos COALESCE por si todavía no hay pagos registrados.
    const fechaActual = new Date();
    const mes = fechaActual.getMonth() + 1;
    const anio = fechaActual.getFullYear();

    const sqlRecaudacion = `
        SELECT COALESCE(SUM(monto_pagado), 0) as recaudado 
        FROM pagos 
        WHERE EXTRACT(MONTH FROM fecha_pago) = $1 
          AND EXTRACT(YEAR FROM fecha_pago) = $2
    `;

    db.get(sqlRecaudacion, [mes, anio], (err, row) => {
        if (err) return console.error("Error en recaudación:", err.message);
        const total = parseFloat(row.recaudado);
        console.log(`💰 Recaudación del Mes (${mes}/${anio}): $${total.toFixed(2)}`);
        console.log("----------------------------------------");
    });

    // 3. Lista de socios que aún deben (Pendientes)
    console.log("🚩 SOCIOS CON DEUDA PENDIENTE:");
    const sqlDeudores = `
        SELECT s.nombre, s.apellido, c.mes, c.anio, c.monto
        FROM socios s
        JOIN cuotas c ON s.id_socio = c.id_socio
        WHERE c.estado_pago = 'PENDIENTE'
        ORDER BY c.anio ASC, c.mes ASC
    `;

    db.all(sqlDeudores, [], (err, filas) => {
        if (err) return console.error("Error en lista deudores:", err.message);

        if (!filas || filas.length === 0) {
            console.log("   ✅ No hay deudores. ¡Todo al día!");
        } else {
            filas.forEach((fila) => {
                const periodo = `${fila.mes.toString().padStart(2, '0')}/${fila.anio}`;
                console.log(`   • ${fila.apellido}, ${fila.nombre} - ${periodo} ($${fila.monto})`);
            });
        }
        console.log("========================================\n");
    });
}

// Ejecutar el dashboard
mostrarDashboard();