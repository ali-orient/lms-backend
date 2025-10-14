const mongoose = require('mongoose');
const Training = require('../models/Training');
const User = require('../models/User');
require('dotenv').config();

const seedTrainings = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orient-lms');
        console.log('Connected to MongoDB for seeding trainings...');

        // Find a compliance user to be the creator
        const complianceUser = await User.findOne({ role: 'compliance' });
        if (!complianceUser) {
            console.error('No compliance user found. Please run seedUsers.js first.');
            return;
        }

        // Clear existing trainings (optional)
        await Training.deleteMany({});
        console.log('Cleared existing trainings');

        // Create sample trainings
        const trainings = [
            {
                title: 'Data Protection Fundamentals',
                description: 'Learn the basics of data protection, privacy laws, and how to handle sensitive information in the workplace.',
                category: 'Compliance',
                duration: 45,
                type: 'youtube',
                status: 'active',
                mandatory: true,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                content: {
                    youtubeUrl: 'https://www.youtube.com/watch?v=TE4UW7MXBGc',
                    videoId: 'TE4UW7MXBGc'
                },
                targetAudience: 'all',
                departments: [],
                roles: [],
                quiz: {
                    questions: [
                        {
                            question: 'What is the primary purpose of data protection laws?',
                            options: [
                                'To make business operations difficult',
                                'To protect individual privacy and personal data',
                                'To increase company profits',
                                'To reduce employee productivity'
                            ],
                            correctAnswer: 1,
                            explanation: 'Data protection laws are designed to protect individual privacy and ensure personal data is handled responsibly.'
                        },
                        {
                            question: 'Which of the following is considered personal data?',
                            options: [
                                'Employee ID numbers',
                                'Email addresses',
                                'Phone numbers',
                                'All of the above'
                            ],
                            correctAnswer: 3,
                            explanation: 'All of these items can be used to identify an individual and are therefore considered personal data.'
                        }
                    ],
                    passingScore: 70,
                    timeLimit: 10
                },
                createdBy: complianceUser._id,
                updatedBy: complianceUser._id
            },
            {
                title: 'Cybersecurity Awareness',
                description: 'Essential cybersecurity practices to protect yourself and the organization from cyber threats.',
                category: 'Security',
                duration: 30,
                type: 'youtube',
                status: 'active',
                mandatory: true,
                deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
                content: {
                    youtubeUrl: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
                    videoId: 'inWWhr5tnEA'
                },
                targetAudience: 'all',
                departments: [],
                roles: [],
                quiz: {
                    questions: [
                        {
                            question: 'What is phishing?',
                            options: [
                                'A type of fishing technique',
                                'A method to catch cyber criminals',
                                'A fraudulent attempt to obtain sensitive information',
                                'A computer programming language'
                            ],
                            correctAnswer: 2,
                            explanation: 'Phishing is a fraudulent attempt to obtain sensitive information by disguising as a trustworthy entity.'
                        }
                    ],
                    passingScore: 80,
                    timeLimit: 5
                },
                createdBy: complianceUser._id,
                updatedBy: complianceUser._id
            },
            {
                title: 'Workplace Safety Guidelines',
                description: 'Important safety procedures and guidelines to ensure a safe working environment for everyone.',
                category: 'Mandatory',
                duration: 25,
                type: 'youtube',
                status: 'active',
                mandatory: false,
                content: {
                    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    videoId: 'dQw4w9WgXcQ'
                },
                targetAudience: 'all',
                departments: [],
                roles: [],
                createdBy: complianceUser._id,
                updatedBy: complianceUser._id
            },
            {
                title: 'Finance Department Training',
                description: 'Specialized training for finance department employees covering financial regulations and procedures.',
                category: 'Technical',
                duration: 60,
                type: 'youtube',
                status: 'active',
                mandatory: true,
                deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                content: {
                    youtubeUrl: 'https://www.youtube.com/watch?v=TE4UW7MXBGc',
                    videoId: 'TE4UW7MXBGc'
                },
                targetAudience: 'specific',
                specificDepartments: ['Finance'],
                roles: [],
                createdBy: complianceUser._id,
                updatedBy: complianceUser._id
            },
            {
                title: 'Leadership Skills Development',
                description: 'Develop essential leadership skills for career advancement and team management.',
                category: 'Soft Skills',
                duration: 40,
                type: 'youtube',
                status: 'active',
                mandatory: false,
                content: {
                    youtubeUrl: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
                    videoId: 'inWWhr5tnEA'
                },
                targetAudience: 'all',
                departments: [],
                roles: [],
                createdBy: complianceUser._id,
                updatedBy: complianceUser._id
            }
        ];

        // Insert trainings
        const createdTrainings = [];
        for (const trainingData of trainings) {
            const training = new Training(trainingData);
            const savedTraining = await training.save();
            createdTrainings.push(savedTraining);
            console.log(`Created training: ${savedTraining.title} (${savedTraining.category}) - Status: ${savedTraining.status}`);
        }
        
        console.log(`Created ${createdTrainings.length} trainings total`);
        console.log('Training database seeding completed successfully!');
        
    } catch (error) {
        console.error('Error seeding trainings:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
};

// Run the seeding function
seedTrainings();