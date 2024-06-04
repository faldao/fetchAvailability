
// src/functions/validateIsDate/index.js

// Función para convertir una cadena de fecha (dd/mm/yyyy) a un objeto Date
const convertirFecha = (fechaString) => {
    const partes = fechaString.split("/");
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Los meses en JavaScript son indexados desde 0
    const anio = parseInt(partes[2], 10);

    const fecha = new Date(anio, mes, dia);
    
    // Verifica que la fecha es válida
    if (fecha.getDate() !== dia || fecha.getMonth() !== mes || fecha.getFullYear() !== anio) {
        return null;
    }
    
    return fecha;
};

// Función para verificar si una fecha es válida y mayor que la fecha actual
const esFechaValidaYMayorQueHoy = (data) => {
    const fechaString = data.fechaString;
    const fecha = convertirFecha(fechaString);

    if (!fecha) {
        return false; // Fecha no válida
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Establece las horas a 0 para solo comparar fechas

    return fecha > hoy;
};

// Función que servirá como punto de entrada para la función de Azure
const validateDateFunction = async (context, req) => {
    const result = esFechaValidaYMayorQueHoy(req.body);

    context.res = {
        status: 200,
        body: { valid: result }
    };
};

export default validateDateFunction;