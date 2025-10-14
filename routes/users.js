const express = require('express');
const router = express.Router();

// Mock user data
const users = [
    { id: 1, username: 'admin', role: 'compliance', email: 'admin@orient.com', name: 'Admin User', department: 'Compliance', joinDate: '2023-01-15' },
    { id: 2, username: 'employee', role: 'employee', email: 'employee@orient.com', name: 'Employee User', department: 'Finance', joinDate: '2023-03-20' },
    { id: 3, username: 'john.doe', role: 'employee', email: 'john.doe@orient.com', name: 'John Doe', department: 'HR', joinDate: '2023-02-10' },
    { id: 4, username: 'jane.smith', role: 'employee', email: 'jane.smith@orient.com', name: 'Jane Smith', department: 'IT', joinDate: '2023-04-05' }
];

// Get all users (compliance only)
router.get('/', (req, res) => {
    res.json({
        success: true,
        users: users.map(user => ({
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            name: user.name,
            department: user.department,
            joinDate: user.joinDate
        }))
    });
});

// Get user by ID
router.get('/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            name: user.name,
            department: user.department,
            joinDate: user.joinDate
        }
    });
});

// Get user profile
router.get('/profile/me', (req, res) => {
    // In a real app, you'd get user ID from JWT token
    const userId = 1; // Mock user ID
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            name: user.name,
            department: user.department,
            joinDate: user.joinDate
        }
    });
});

// Update user profile
router.put('/profile/me', (req, res) => {
    const { name, email, department } = req.body;
    const userId = 1; // Mock user ID
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Update user data
    if (name) users[userIndex].name = name;
    if (email) users[userIndex].email = email;
    if (department) users[userIndex].department = department;

    res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
            id: users[userIndex].id,
            username: users[userIndex].username,
            role: users[userIndex].role,
            email: users[userIndex].email,
            name: users[userIndex].name,
            department: users[userIndex].department,
            joinDate: users[userIndex].joinDate
        }
    });
});

module.exports = router;