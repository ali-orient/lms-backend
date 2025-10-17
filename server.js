const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('./config/database');
require('dotenv').config({ override: true });

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Build CSP directives
const cspDirectives = {
    frameAncestors: ["'self'", "http://localhost:3001", "http://localhost:3000"],
    mediaSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "data:", "blob:"],
    connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]
};
if (isDev) {
    // Disable HTTPS upgrade in dev to avoid Failed to fetch on http
    cspDirectives.upgradeInsecureRequests = null;
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: cspDirectives
    },
    frameguard: {
        action: 'sameorigin'
    },
    crossOriginResourcePolicy: false // Disable CORP for video streaming
}));
// Build allowed origins list (support comma-separated FRONTEND_URL env)
const defaultAllowedOrigins = [
    'http://localhost:8000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:5173',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3003',
    'null' // allow sandboxed iframes (origin "null") for dev viewers
];
const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean)
    : [];
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl) and same-origin
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Special-case for sandboxed iframes which present "null" origin
        if (origin === 'null' && allowedOrigins.includes('null')) return callback(null, true);
        return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
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
app.use(express.static(path.join(__dirname, '../frontend-react/dist')));

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
    res.sendFile(path.join(__dirname, '../frontend-react/dist/index.html'));
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
            // nodemon reload marker
            console.log(`📱 Frontend served at: http://localhost:${PORT}`);
            // restart trigger for env updates (CORS origins)
            console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;