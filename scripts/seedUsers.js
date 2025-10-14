const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orient-lms');
        console.log('Connected to MongoDB for seeding...');

        // Clear existing users (optional - remove this line if you want to keep existing users)
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create initial users
        const users = [
            {
                username: 'admin',
                email: 'admin@orient.com',
                password: 'admin123', // Will be hashed by the model
                name: 'Admin User',
                role: 'compliance',
                department: 'Compliance',
                position: 'Compliance Manager',
                isActive: true
            },
            {
                username: 'employee',
                email: 'employee@orient.com',
                password: 'emp123', // Will be hashed by the model
                name: 'Employee User',
                role: 'employee',
                department: 'Operations',
                position: 'Staff Member',
                isActive: true
            }
        ];

        // Insert users one by one to trigger pre-save hooks
        const createdUsers = [];
        for (const userData of users) {
            const user = new User(userData);
            const savedUser = await user.save();
            createdUsers.push(savedUser);
            console.log(`Created user: ${savedUser.username} (${savedUser.role}) - ${savedUser.email}`);
        }
        
        console.log(`Created ${createdUsers.length} users total`);

        console.log('Database seeding completed successfully!');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
};

// Run the seeding function
seedUsers();