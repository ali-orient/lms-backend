const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const ldapService = require('../services/ldap');
const crypto = require('crypto');
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

        const authProvider = (process.env.AUTH_PROVIDER || '').toLowerCase();
        if (authProvider === 'ad') {
            try {
                const adUser = await ldapService.authenticate({ username, password });
                const normalizedUsername = adUser.sAMAccountName || (adUser.userPrincipalName ? adUser.userPrincipalName.split('@')[0] : username);

                let user = await User.findOne({
                    username: normalizedUsername,
                    isActive: true
                });

                // Determine role from AD groups, then apply admin override via ADMIN_UPNS if matched
                const groupRole = ldapService.mapRole(adUser.memberOf);
                const adminUPNsEnv = process.env.ADMIN_UPNS || '';
                const adminUPNs = adminUPNsEnv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                const adUpn = (adUser.userPrincipalName || '').toLowerCase();
                const adMail = (adUser.mail || '').toLowerCase();
                const isAdminOverride = adminUPNs.includes(adUpn) || adminUPNs.includes(adMail);

                if (!user) {
                    user = new User({
                        username: normalizedUsername,
                        email: adUser.mail || `${normalizedUsername}@${process.env.AD_DOMAIN || 'orient-power.com'}`,
                        password: crypto.randomBytes(24).toString('hex'),
                        name: adUser.displayName || adUser.cn || normalizedUsername,
                        role: isAdminOverride ? 'admin' : groupRole,
                        isActive: true
                    });
                    await user.save();
                } else {
                    // Update last login and elevate to admin if override applies
                    await user.updateLastLogin();
                    if (isAdminOverride && user.role !== 'admin') {
                        user.role = 'admin';
                        await user.save();
                    }
                }

                const token = jwt.sign(
                    {
                        userId: user._id,
                        username: user.username,
                        role: user.role
                    },
                    process.env.JWT_SECRET || 'fallback_secret',
                    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
                );

                return res.json({
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
            } catch (e) {
                try {
                    const summary = e && (e.code || e.name || e.message);
                    const details = e && e.details ? `details: ${e.details}` : '';
                    const subcode = e && e.adSubCode ? `subcode: ${e.adSubCode}` : '';
                    const stack = e && e.stack ? `stack: ${e.stack}` : '';
                    let raw = '';
                    try {
                        raw = e ? ` raw: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}` : '';
                    } catch (_) {}
                    console.error('AD login failed:', summary, details, subcode, stack, raw);
                } catch (logErr) {
                    console.error('AD login failed (log error):', logErr && (logErr.message || logErr));
                }
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        }

        // Fallback to local DB auth when AUTH_PROVIDER is not 'ad'
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
router.get('/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
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