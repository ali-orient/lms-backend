const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            frameAncestors: ["'self'", "http://localhost:3001", "http://localhost:3000"],
            mediaSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "data:", "blob:"]
        }
    },
    frameguard: {
        action: 'sameorigin'
    },
    crossOriginResourcePolicy: false // Disable CORP for video streaming
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:8000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Accept-Ranges', 'Content-Encoding', 'Content-Length', 'Content-Range', 'Content-Type']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/training', require('./routes/training'));
app.use('/api/training-materials', require('./routes/trainingMaterials'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/files', require('./routes/files'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

// Connect to database and start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`🚀 Orient LMS Backend Server running on port ${PORT}`);
            console.log(`📱 Frontend served at: http://localhost:${PORT}`);
            console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;