const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', false);
        const conn = await (mongoose.connect(process.env.MONGODB_URI));
        console.log(`Database connected: ${conn.connection.host}`);
        
    } catch (error) {
        // Error on initial connection:
        console.log(error);
        
    }

    // Error after initial connection was established: 
    mongoose.connection.on('error', err =>{
        console.log('Error connecting to database', err);
    })
}

module.exports = connectDB;