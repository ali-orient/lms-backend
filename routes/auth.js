const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// Login endpoint
router.post('/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { username, password } = req.body;

        // Find user by username only (role will be determined from the user record)
        const user = await User.findOne({ 
            username: username,
            isActive: true 
        });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password using the model method
        const isValidPassword = await user.comparePassword(password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await user.updateLastLogin();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                email: user.email,
                name: user.name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

// Verify token endpoint
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email,
                name: user.name
            }
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

module.exports = router;