const mongoose = require('mongoose');

// Database configuration
const dbConfig = {
    // MongoDB connection URI
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/orient-lms',
    
    // Database name
    dbName: process.env.DB_NAME || 'orient-lms',
    
    // Connection options
    options: {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds
        bufferCommands: false, // Disable mongoose buffering
    }
};

// Connect to MongoDB
const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        
        const conn = await mongoose.connect(dbConfig.uri, dbConfig.options);
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        
        // In development, we'll continue without database
        if (process.env.NODE_ENV === 'development') {
            console.log('Running in development mode without database connection');
            return null;
        }
        
        // In production, exit the process
        process.exit(1);
    }
};

// Disconnect from MongoDB
const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error.message);
    }
};

// Check database connection status
const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

// Get database connection info
const getConnectionInfo = () => {
    if (!isConnected()) {
        return {
            status: 'disconnected',
            host: null,
            database: null
        };
    }

    return {
        status: 'connected',
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        readyState: mongoose.connection.readyState
    };
};

// Database health check
const healthCheck = async () => {
    try {
        if (!isConnected()) {
            return {
                status: 'unhealthy',
                message: 'Database not connected'
            };
        }

        // Ping the database
        await mongoose.connection.db.admin().ping();
        
        return {
            status: 'healthy',
            message: 'Database connection is working',
            info: getConnectionInfo()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            message: error.message
        };
    }
};

// Graceful shutdown
const gracefulShutdown = () => {
    process.on('SIGINT', async () => {
        console.log('Received SIGINT. Gracefully shutting down...');
        await disconnectDB();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('Received SIGTERM. Gracefully shutting down...');
        await disconnectDB();
        process.exit(0);
    });
};

// Mock data service for development without database
const mockDataService = {
    // This would be used when database is not available
    // All route handlers already use mock data, so this is just for consistency
    isEnabled: () => !isConnected(),
    
    getStatus: () => ({
        status: 'mock',
        message: 'Using mock data service (no database connection)',
        features: [
            'User authentication with JWT',
            'Policy management',
            'Training modules',
            'Announcements',
            'Reports and analytics',
            'Incident reporting'
        ]
    })
};

module.exports = {
    connectDB,
    disconnectDB,
    isConnected,
    getConnectionInfo,
    healthCheck,
    gracefulShutdown,
    mockDataService,
    dbConfig
};