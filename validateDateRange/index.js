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

// Función para verificar si la fecha de partida es mayor que la fecha de llegada
export const esDepartureMayorQueArrival = (data) => {
    const { arrivalString, departureString } = data;

    // Expresión regular para validar el formato de las fechas (dd/mm/yyyy)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

    if (!dateRegex.test(arrivalString) || !dateRegex.test(departureString)) {
        return false; // Formato de fecha no válido
    }

    const arrivalDate = convertirFecha(arrivalString);
    const departureDate = convertirFecha(departureString);

    // Verifica que ambas fechas sean válidas y que la fecha de partida sea mayor que la de llegada
    if (!arrivalDate || !departureDate || departureDate <= arrivalDate) {
        return false;
    }

    return true;
};

// Función que servirá como punto de entrada para la función de Azure
export async function validateDateRange(context, req) {
    if (!req.body || !req.body.arrivalString || !req.body.departureString) {
        context.res = {
            status: 400,
            body: { error: "Invalid input, please provide arrivalString and departureString in the request body." }
        };
        return;
    }
    
    const isValid = esDepartureMayorQueArrival(req.body);

    context.res = {
        status: 200,
        body: { valid: isValid }
    };
}

export default validateDateRange;