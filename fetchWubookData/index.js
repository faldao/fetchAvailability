// Importa las dependencias usando la sintaxis de ES modules
import axios from 'axios';
import qs from 'qs';

// Función para calcular los días entre dos fechas
const calculateDaysBetween = (arrival, departure) => {
    const [dayA, monthA, yearA] = arrival.split('/');
    const [dayD, monthD, yearD] = departure.split('/');
    const arrivalDate = new Date(yearA, monthA - 1, dayA);
    const departureDate = new Date(yearD, monthD - 1, dayD);
    return (departureDate - arrivalDate) / (1000 * 60 * 60 * 24);
};

// Función principal que manejará las solicitudes
const fetchWubookData = async function (context, req) {
    const { arrival, departure } = req.body;
    if (!arrival || !departure) {
        context.res = {
            status: 400,
            body: { error: 'Invalid request, arrival and departure dates are required.' }
        };
        return;
    }

    const headers = {
        'x-api-key': process.env.WUBOOK_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    const base_url = "https://kapi.wubook.net/kp";
    const rate_id = 37166;
    const images_url = "https://candallarq57078.ipage.com/images/";

    console.log(`Incoming request with arrival: ${arrival}, departure: ${departure}`);
    console.log(`Configured headers with API Key:`, headers);

    try {
        const [responseProducts, responseAvailability] = await Promise.all([
            axios.post(`${base_url}/property/fetch_products`, {}, { headers }),
            axios.post(`${base_url}/inventory/fetch_rooms_availability`, qs.stringify({ arrival, departure }), { headers })
        ]);

        const productsData = responseProducts.data.data || [];
        const availabilityData = responseAvailability.data.data || {};

        console.log('Products Data:', productsData);
        console.log('Availability Data:', availabilityData);

        const productMap = productsData.reduce((acc, product) => {
            if (product.master === 1) {
                acc[product.id_zak_room_type] = product;
            }
            return acc;
        }, {});

        console.log('Product Map:', productMap);

        const room_nights = calculateDaysBetween(arrival, departure);
        const ratesRequests = [];

        for (const [roomTypeId, product] of Object.entries(productMap)) {
            if (availabilityData[roomTypeId] && availabilityData[roomTypeId].rooms > 0) {
                ratesRequests.push(
                    axios.post(`${base_url}/inventory/fetch_rate_values`, null, {
                        params: {
                            from: arrival,
                            rate: rate_id,
                            n: room_nights
                        },
                        headers
                    })
                        .then(rateResponse => {
                            console.log(`Rates for product ${product.id}:`, rateResponse.data);
                            const rateData = rateResponse.data.data[product.id];
                            const totalRate = rateData ? Math.round(rateData.reduce((acc, rate) => acc + rate.p, 0)) : 0;
                            return {
                                product_id: product.id,
                                room_type_id: product.id_zak_room_type,
                                product_name: product.name,
                                short_room_name: product.srname,
                                room_name: product.rname,
                                room_image_url: `${images_url}${product.id_zak_property}_${product.srname}.jpg`,
                                totalRate: `${totalRate} USD`,
                                availableRooms: availabilityData[roomTypeId].rooms
                            };
                        })
                        .catch(error => {
                            console.error(`Error fetching rate values for room type ID ${roomTypeId}:`, error);
                            return null;
                        })
                );
            }
        }

        const ratesResults = await Promise.all(ratesRequests);
        const resultsWithAvailability = ratesResults.filter(result => result != null);
        console.log('Results with Availability:', resultsWithAvailability);

        context.res = {
            body: { resultsWithAvailability }
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        context.res = {
            status: 500,
            body: { error: error.message }
        };
    }
};

export default fetchWubookData;