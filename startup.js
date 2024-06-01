import express from 'express';
import dotenv from 'dotenv';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Importar la función fetchWubookData
import fetchWubookData from './fetchWubookData/index.js';

const app = express();
app.use(express.json());

// Definir la ruta para la función fetchWubookData
app.post('/fetch_wubook_data', fetchWubookData);

// Exportar la aplicación para usarla en Azure Functions
export default app;