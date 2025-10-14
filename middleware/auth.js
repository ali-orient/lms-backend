const jwt = require('jsonwebtoken');

// Mock users for demonstration
const users = [
    {
        id: 1,
        email: 'compliance@orient.com',
        role: 'compliance',
        department: 'Compliance',
        name: 'Compliance Team'
    },
    {
        id: 2,
        email: 'employee@orient.com',
        role: 'employee',
        department: 'Finance',
        name: 'John Doe'
    }
];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Support token via Authorization header OR query string (for media tag requests)
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token && req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Normalize decoded token so routes can consistently use req.user.id
        const normalizedUser = { ...user };
        if (!normalizedUser.id && normalizedUser.userId) {
            normalizedUser.id = normalizedUser.userId;
        }

        req.user = normalizedUser;
        next();
    });
};

// Middleware to check if user has required role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Convert single role to array
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Middleware to check if user is compliance team
const requireCompliance = requireRole(['compliance', 'admin']);

// Middleware to check if user is manager or above
const requireManager = requireRole(['manager', 'compliance', 'admin']);

// Middleware to validate user exists
const validateUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }

    // In a real application, you would check the database
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    req.userDetails = user;
    next();
};

// Middleware to log user actions for audit trail
const auditLog = (action) => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log the action (in a real app, this would go to a database or log service)
            const logEntry = {
                userId: req.user?.id,
                userEmail: req.user?.email,
                action,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                success: res.statusCode < 400
            };

            console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
            
            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

// Middleware to check resource ownership
const checkOwnership = (resourceIdParam = 'id') => {
    return (req, res, next) => {
        const resourceId = req.params[resourceIdParam];
        const userId = req.user.id;

        // For compliance team, allow access to all resources
        if (req.user.role === 'compliance' || req.user.role === 'admin') {
            return next();
        }

        // For regular users, check if they own the resource
        // This is a simplified check - in a real app, you'd query the database
        if (resourceId && parseInt(resourceId) !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: You can only access your own resources'
            });
        }

        next();
    };
};

// Middleware to rate limit sensitive operations
const rateLimitSensitive = (req, res, next) => {
    // In a real application, you would implement proper rate limiting
    // This is a simplified version for demonstration
    const userKey = req.user?.id || req.ip;
    const now = Date.now();
    
    // Initialize rate limit store if it doesn't exist
    if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
    }

    const userRequests = global.rateLimitStore.get(userKey) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    // Check if user has exceeded limit (10 requests per minute for sensitive operations)
    if (recentRequests.length >= 10) {
        return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.'
        });
    }

    // Add current request
    recentRequests.push(now);
    global.rateLimitStore.set(userKey, recentRequests);

    next();
};

// Middleware to validate request data
const validateRequest = (schema) => {
    return (req, res, next) => {
        // This is a simplified validation - in a real app, use a library like Joi or express-validator
        if (schema.requiredFields) {
            for (const field of schema.requiredFields) {
                if (!req.body[field]) {
                    return res.status(400).json({
                        success: false,
                        message: `Missing required field: ${field}`
                    });
                }
            }
        }

        if (schema.emailFields) {
            for (const field of schema.emailFields) {
                if (req.body[field] && !isValidEmail(req.body[field])) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid email format: ${field}`
                    });
                }
            }
        }

        next();
    };
};

// Helper function to validate email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Middleware to handle async errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    authenticateToken,
    requireRole,
    requireCompliance,
    requireManager,
    validateUser,
    auditLog,
    checkOwnership,
    rateLimitSensitive,
    validateRequest,
    asyncHandler
};