import axios from 'axios';
import qs from 'qs';

const fetchReservations = async function (context, req) {
    const { fromDate, toDate, roomTypeId } = req.body;
    context.log(`Request body: ${JSON.stringify(req.body)}`);
    
    if (!fromDate || !toDate || !roomTypeId) {
        context.log(`Missing required parameters. fromDate: ${fromDate}, toDate: ${toDate}, roomTypeId: ${roomTypeId}`);
        context.res = {
            status: 400,
            body: { error: 'Invalid request, fromDate, toDate, and roomTypeId are required.' }
        };
        return;
    }

    const headers = {
        'x-api-key': process.env.WUBOOK_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    const base_url = "https://kapi.wubook.net/kp";
    context.log(`Configured headers with API Key: ${process.env.WUBOOK_API_KEY ? 'Provided' : 'Missing'}`);

    // Función auxiliar para convertir 'dd/mm/yyyy' a Date
    const parseDate = (str) => {
        const [day, month, year] = str.split('/');
        return new Date(`${year}-${month}-${day}`);
    };

    // Función auxiliar para formatear la fecha a 'dd/mm/yyyy'
    const formatDateToDDMMYYYY = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const fromDateObj = parseDate(fromDate);
    const toDateObj = parseDate(toDate);

    context.log(`Fetching reservations from ${fromDate} (${fromDateObj}) to ${toDate} (${toDateObj})`);

    let currentDate = new Date(fromDateObj);
    let allReservations = [];

    while (currentDate <= toDateObj) {
        const formattedDate = formatDateToDDMMYYYY(currentDate);
        context.log(`Fetching reservations for date: ${formattedDate}`);

        try {
            const response = await axios.post(`${base_url}/reservations/fetch_reservations`, qs.stringify({
                filters: JSON.stringify({
                    arrival: { from: formattedDate, to: formattedDate },
                    pager: { limit: 64, offset: 0 }
                })
            }), { headers });

            context.log(`Wubook API Response Status for ${formattedDate}:`, response.status);
            context.log(`Wubook API Response Data for ${formattedDate}:`, JSON.stringify(response.data));

            const reservations = response.data.data.reservations || [];
            context.log(`Reservations for ${formattedDate}:`, reservations);

            allReservations.push(...reservations);
        } catch (error) {
            context.log(`Error fetching reservations for date ${formattedDate}:`, error.message || error);
            context.res = {
                status: 500,
                body: { error: error.message }
            };
            return;
        }

        // Mover al día siguiente
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filtrar las reservas que contengan el `id_zak_room_type` especificado y el check-in dentro del período
    const filteredReservations = allReservations.filter(reservation => {
        const hasMatchingRoom = reservation.rooms.some(room => room.id_zak_room === roomTypeId);

        reservation.rooms.forEach(room => {
            context.log(`Reservation Room: ${JSON.stringify(room)}`);
        });

        const withinDateRange = reservation.rooms.some(room => {
            const checkInDate = parseDate(room.dfrom);  // Assuming dfrom is in format 'dd/mm/yyyy'
            const checkOutDate = parseDate(room.dto);  // Assuming dto is in format 'dd/mm/yyyy'
            return (checkInDate >= fromDateObj && checkInDate <= toDateObj) || 
                   (checkOutDate >= fromDateObj && checkOutDate <= toDateObj);
        });

        if (hasMatchingRoom && withinDateRange) {
            context.log(`Matching reservation ID: ${reservation.id}`);
            return true;
        }
        return false;
    });

    context.log('Filtered Reservations:', JSON.stringify(filteredReservations));

    context.res = {
        body: { reservations: filteredReservations }
    };
};

export default fetchReservations;


