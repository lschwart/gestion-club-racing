const db = require('../database');

// Función para ver quiénes deben cuotas
function listarDeudores() {
    const sql = `
        SELECT 
            s.nombre, 
            s.apellido, 
            c.mes, 
            c.anio, 
            cat.costo_mensual as monto
        FROM socios s
        JOIN cuotas c ON s.id_socio = c.id_socio
        JOIN categorias cat ON s.id_categoria = cat.id_categoria
        WHERE c.estado_pago = 'PENDIENTE'
    `;

    db.all(sql, [], (err, filas) => {
        if (err) {
            return console.error("Error al consultar:", err.message);
        }

        console.log("--- LISTA DE DEUDORES ---");
        if (filas.length === 0) {
            console.log("¡Increíble! Todos los socios están al día.");
        } else {
            filas.forEach((fila) => {
                console.log(`${fila.nombre} ${fila.apellido} debe el mes ${fila.mes}/${fila.anio} ($${fila.monto})`);
            });
        }
        console.log("-------------------------");
    });
}

// Ejecutar la consulta
listarDeudores();

// db.close();