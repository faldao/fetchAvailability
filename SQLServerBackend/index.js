import Sequelize from 'sequelize';  
import cors from 'cors';  

const sequelize = new Sequelize('Chatbotviproomer', 'faldao', '@Ericsson90210', {  
    host: 'viproomersqlserver1.database.windows.net',  
    dialect: 'mssql',  
    dialectOptions: {  
        encrypt: true  
    },  
    logging: false  
});  

const User = sequelize.define('users', {  
    user_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },  
    username: { type: Sequelize.STRING, unique: true },  
    email: { type: Sequelize.STRING, unique: true },  
    password_hash: Sequelize.STRING,  
    first_name: Sequelize.STRING,  
    last_name: Sequelize.STRING,  
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },  
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },  
    last_login: { type: Sequelize.DATE, defaultValue: Sequelize.literal('1900-01-01 00:00:00') },  
    is_active: { type: Sequelize.BOOLEAN, defaultValue: true }  
}, { timestamps: false });  

const Property = sequelize.define('properties', {  
    property_id: { type: Sequelize.INTEGER, primaryKey: true },  
    property_name: Sequelize.STRING,  
    property_description: Sequelize.TEXT,  
    api_key: Sequelize.TEXT  
}, { timestamps: false });  

const Apartment = sequelize.define('apartments', {  
    apartment_id: { type: Sequelize.INTEGER, primaryKey: true },  
    apartment_wubook_shortname: Sequelize.TEXT,  
    apartment_name: Sequelize.TEXT,  
    apartment_description: Sequelize.TEXT,  
    property_id: Sequelize.INTEGER,  
    consulta: Sequelize.INTEGER,  
    chatbot: Sequelize.INTEGER  
}, { timestamps: false });  

const UserApartment = sequelize.define('user_apartments', {  
    user_id: { type: Sequelize.INTEGER, primaryKey: true },  
    apartment_id: { type: Sequelize.INTEGER, primaryKey: true }  
}, { timestamps: false });  

Property.hasMany(Apartment, { foreignKey: 'property_id' });  
Apartment.belongsTo(Property, { foreignKey: 'property_id' });  
User.belongsToMany(Apartment, { through: UserApartment, foreignKey: 'user_id' });  
Apartment.belongsToMany(User, { through: UserApartment, foreignKey: 'apartment_id' });  

async function warmUp(context) {  
    context.log('Warm-up function called');  

    try {  
        // Realizamos una consulta ligera para calentar la conexión  
        await sequelize.query('SELECT 1');  
        context.res = {  
            status: 200,  
            body: { success: true, message: 'Database connection warmed up' }  
        };  
    } catch (error) {  
        context.log('Warm-up error:', error);  
        context.res = {  
            status: 500,  
            body: { success: false, message: 'Internal server error' }  
        };  
    }  
}

async function login(context, req) {  
    context.log('Login function called');  
    const { username, password } = req.body || {};  

    try {  
        const user = await User.findOne({ where: { username, password_hash: password } });  
        if (user) {  
            context.log('User found:', user.user_id);  
            context.res = {  
                body: {   
                    success: true,   
                    userId: user.user_id,  
                    firstName: user.first_name,  
                    lastName: user.last_name  
                }  
            };  
        } else {  
            context.log('Invalid username or password');  
            context.res = {  
                status: 401,  
                body: { success: false, message: 'Invalid username or password' }  
            };  
        }  
    } catch (error) {  
        context.log('Login error:', error);  
        context.res = {  
            status: 500,  
            body: { success: false, message: 'Internal server error' }  
        };  
    }  
} 

async function properties(context, req) {  
    context.log('Properties function called');  
    const { userId } = req.query;  

    try {  
        const properties = await Property.findAll({  
            include: [{  
                model: Apartment,  
                required: true,  
                include: [{  
                    model: User,  
                    required: true,  
                    through: { where: { user_id: userId } }  
                }]  
            }]  
        });  
        context.log('Properties found:', properties.length);  
        context.res = {  
            body: properties  
        };  
    } catch (error) {  
        context.log('Error fetching properties:', error);  
        context.res = {  
            status: 500,  
            body: { success: false, message: 'Internal server error' }  
        };  
    }  
}  

async function apartments(context, req) {  
    context.log('Apartments function called');  
    const { propertyId, userId } = req.query;  

    try {  
        const apartments = await Apartment.findAll({  
            where: { property_id: propertyId },  
            include: [{  
                model: User,  
                required: true,  
                through: { where: { user_id: userId } }  
            }]  
        });  
        context.log('Apartments found:', apartments.length);  
        context.res = {  
            body: apartments  
        };  
    } catch (error) {  
        context.log('Error fetching apartments:', error);  
        context.res = {  
            status: 500,  
            body: { success: false, message: 'Internal server error' }  
        };  
    }  
}  

export default async function (context, req) {  
    context.log('Function called with method:', req.method, 'and action:', req.params.action);  
    const method = req.method.toLowerCase();  
    const action = req.params.action;  

    if (method === 'post' && action === 'login') {  
        await login(context, req);  
    } else if (method === 'get' && action === 'properties') {  
        await properties(context, req);  
    } else if (method === 'get' && action === 'apartments') {  
        await apartments(context, req);  
    } else if (method === 'get' && action === 'warmup') {  
        await warmUp(context);  
    } else {  
        context.log('Route not found');  
        context.res = {  
            status: 404,  
            body: 'Route not found'  
        };  
    }  
} 