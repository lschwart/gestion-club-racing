const db = require('./database'); // Cambiamos la conexión local por la de Supabase

// Función para ver quiénes deben cuotas
function listarDeudores() {
    // CAMBIOS: 
    // - ? no hay, pero ajustamos nombres de columnas
    // - cat.costo_mensual lo sacamos de la tabla categorias
    // - s.id_categoria es la unión
    const sql = `
        SELECT 
            s.nombre, 
            s.apellido, 
            c.mes, 
            c.anio, 
            c.monto
        FROM socios s
        JOIN cuotas c ON s.id_socio = c.id_socio
        WHERE c.estado_pago = 'PENDIENTE'
        ORDER BY c.anio ASC, c.mes ASC, s.apellido ASC
    `;

    // Usamos db.all que es el adaptador que configuramos en database.js
    db.all(sql, [], (err, filas) => {
        if (err) {
            return console.error("❌ Error al consultar deudores en Supabase:", err.message);
        }

        console.log("\n--- 📋 LISTA DE DEUDORES (SAN CRISTÓBAL) ---");
        
        if (!filas || filas.length === 0) {
            console.log("✅ ¡Increíble! Todos los socios están al día.");
        } else {
            filas.forEach((fila) => {
                // Formateamos un poco la salida para que sea legible en consola
                const periodo = `${fila.mes.toString().padStart(2, '0')}/${fila.anio}`;
                console.log(`• ${fila.apellido}, ${fila.nombre} - Periodo: ${periodo} - Monto: $${fila.monto}`);
            });
            console.log(`\nTotal de cuotas pendientes: ${filas.length}`);
        }
        console.log("-------------------------------------------\n");
    });
}

// Ejecutar la consulta
listarDeudores();