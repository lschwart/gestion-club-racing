const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/socios.db');

db.serialize(() => {
    console.log("Revisando estructura de la base de datos...");

    // Creamos la tabla de pagos
    const sqlPagos = `
        CREATE TABLE IF NOT EXISTS pagos (
            id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cuota INTEGER NOT NULL,
            monto_abonado DECIMAL(10, 2) NOT NULL,
            fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
            metodo_pago TEXT, -- Ejemplo: 'Efectivo', 'Tarjeta', 'Transferencia'
            comprobante_nro TEXT, -- Para guardar un ID de transacción externa
            FOREIGN KEY (id_cuota) REFERENCES cuotas(id_cuota)
        )
    `;

    db.run(sqlPagos, (err) => {
        if (err) {
            console.error("Error al crear la tabla pagos:", err.message);
        } else {
            console.log("¡Tabla 'pagos' creada exitosamente!");
        }
    });
});

db.close();