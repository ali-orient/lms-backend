const express = require('express');
const router = express.Router();

// Mock analytics data
const generateMockData = () => {
    const currentDate = new Date();
    const last30Days = [];
    const last12Months = [];

    // Generate last 30 days data
    for (let i = 29; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        last30Days.push({
            date: date.toISOString().split('T')[0],
            value: Math.floor(Math.random() * 50) + 10
        });
    }

    // Generate last 12 months data
    for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        last12Months.push({
            month: date.toISOString().slice(0, 7),
            value: Math.floor(Math.random() * 200) + 50
        });
    }

    return { last30Days, last12Months };
};

// Get overall dashboard analytics
router.get('/dashboard', (req, res) => {
    const { period = '30' } = req.query;
    const { last30Days, last12Months } = generateMockData();

    const analytics = {
        overview: {
            totalUsers: 150,
            activeUsers: 142,
            totalPolicies: 25,
            acknowledgedPolicies: 23,
            totalTrainings: 12,
            completedTrainings: 8,
            complianceScore: 92.3,
            riskLevel: 'Low'
        },
        departmentStats: {
            Finance: {
                totalEmployees: 35,
                activeEmployees: 33,
                trainingCompletion: 89.2,
                policyAcknowledgment: 94.3,
                complianceScore: 91.5
            },
            IT: {
                totalEmployees: 28,
                activeEmployees: 27,
                trainingCompletion: 91.5,
                policyAcknowledgment: 96.4,
                complianceScore: 93.2
            },
            HR: {
                totalEmployees: 22,
                activeEmployees: 21,
                trainingCompletion: 96.8,
                policyAcknowledgment: 100.0,
                complianceScore: 95.8
            },
            Operations: {
                totalEmployees: 30,
                activeEmployees: 28,
                trainingCompletion: 85.7,
                policyAcknowledgment: 90.0,
                complianceScore: 88.9
            },
            Legal: {
                totalEmployees: 15,
                activeEmployees: 15,
                trainingCompletion: 95.1,
                policyAcknowledgment: 100.0,
                complianceScore: 97.3
            },
            Compliance: {
                totalEmployees: 20,
                activeEmployees: 18,
                trainingCompletion: 100.0,
                policyAcknowledgment: 100.0,
                complianceScore: 98.5
            }
        },
        userEngagement: {
            dailyActiveUsers: last30Days.map(d => ({
                date: d.date,
                users: Math.floor(d.value * 2.8)
            })),
            monthlyActiveUsers: last12Months.map(m => ({
                month: m.month,
                users: Math.floor(m.value * 0.7)
            })),
            loginFrequency: {
                daily: 45,
                weekly: 78,
                monthly: 27
            }
        },
        compliance: {
            policyAcknowledgment: {
                total: 450,
                completed: 435,
                pending: 15,
                overdue: 8,
                rate: 96.7
            },
            trainingCompletion: {
                total: 1800, // 150 users * 12 trainings
                completed: 1575,
                inProgress: 135,
                notStarted: 90,
                rate: 87.5
            },
            trends: last30Days.map(d => ({
                date: d.date,
                complianceScore: Math.min(100, Math.max(80, 92 + (Math.random() - 0.5) * 10))
            }))
        },
        training: {
            completionRates: [
                { course: 'Data Protection Fundamentals', rate: 95.2 },
                { course: 'Anti-Money Laundering', rate: 89.7 },
                { course: 'Code of Conduct', rate: 97.8 },
                { course: 'Cybersecurity Awareness', rate: 82.4 },
                { course: 'Workplace Safety', rate: 91.3 }
            ],
            averageScores: [
                { course: 'Data Protection Fundamentals', score: 87.5 },
                { course: 'Anti-Money Laundering', score: 84.2 },
                { course: 'Code of Conduct', score: 92.1 },
                { course: 'Cybersecurity Awareness', score: 79.8 },
                { course: 'Workplace Safety', score: 88.7 }
            ],
            timeToComplete: [
                { course: 'Data Protection Fundamentals', avgMinutes: 45 },
                { course: 'Anti-Money Laundering', avgMinutes: 62 },
                { course: 'Code of Conduct', avgMinutes: 38 },
                { course: 'Cybersecurity Awareness', avgMinutes: 55 },
                { course: 'Workplace Safety', avgMinutes: 41 }
            ]
        },
        incidents: {
            total: 15,
            resolved: 12,
            pending: 3,
            byCategory: [
                { category: 'Security', count: 6 },
                { category: 'Policy Violation', count: 4 },
                { category: 'Operational', count: 3 },
                { category: 'Regulatory', count: 2 }
            ],
            bySeverity: [
                { severity: 'High', count: 3 },
                { severity: 'Medium', count: 7 },
                { severity: 'Low', count: 5 }
            ],
            trends: last30Days.map(d => ({
                date: d.date,
                incidents: Math.floor(Math.random() * 3)
            }))
        },
        Announcements: {
            totalAnnouncements: 25,
            readRate: 89.4,
            blogPosts: 8,
            blogEngagement: 76.2,
            byType: [
                { type: 'Announcement', count: 15 },
                { type: 'News', count: 6 },
                { type: 'Reminder', count: 4 }
            ]
        }
    };

    res.json({
        success: true,
        analytics,
        period: `${period} days`,
        generatedAt: new Date().toISOString()
    });
});

// Get user analytics
router.get('/users', (req, res) => {
    const { department, role } = req.query;
    const { last30Days } = generateMockData();

    const userAnalytics = {
        demographics: {
            byDepartment: [
                { department: 'Finance', count: 35, percentage: 23.3 },
                { department: 'IT', count: 28, percentage: 18.7 },
                { department: 'HR', count: 22, percentage: 14.7 },
                { department: 'Operations', count: 30, percentage: 20.0 },
                { department: 'Legal', count: 15, percentage: 10.0 },
                { department: 'Compliance', count: 20, percentage: 13.3 }
            ],
            byRole: [
                { role: 'Employee', count: 120, percentage: 80.0 },
                { role: 'Manager', count: 25, percentage: 16.7 },
                { role: 'Compliance Team', count: 5, percentage: 3.3 }
            ]
        },
        activity: {
            loginFrequency: last30Days.map(d => ({
                date: d.date,
                logins: Math.floor(d.value * 1.2)
            })),
            sessionDuration: {
                average: 24.5, // minutes
                median: 18.2,
                longest: 127.3,
                shortest: 2.1
            },
            featureUsage: [
                { feature: 'Policy Review', usage: 89.3 },
                { feature: 'Training Modules', usage: 76.8 },
                { feature: 'Announcements', usage: 82.1 },
                { feature: 'Reports', usage: 45.2 },
                { feature: 'Dashboard', usage: 91.7 }
            ]
        },
        performance: {
            topPerformers: [
                { name: 'Sarah Johnson', department: 'Finance', score: 98.5 },
                { name: 'Michael Chen', department: 'IT', score: 97.2 },
                { name: 'Emily Davis', department: 'HR', score: 96.8 },
                { name: 'David Wilson', department: 'Operations', score: 95.9 },
                { name: 'Lisa Anderson', department: 'Legal', score: 95.1 }
            ],
            averageScores: {
                overall: 87.3,
                byDepartment: [
                    { department: 'Finance', score: 89.2 },
                    { department: 'IT', score: 91.5 },
                    { department: 'HR', score: 88.7 },
                    { department: 'Operations', score: 85.1 },
                    { department: 'Legal', score: 92.3 },
                    { department: 'Compliance', score: 94.8 }
                ]
            }
        }
    };

    res.json({
        success: true,
        userAnalytics,
        filters: { department, role },
        generatedAt: new Date().toISOString()
    });
});

// Get policy analytics
router.get('/policies', (req, res) => {
    const { category, timeframe = '30' } = req.query;
    const { last30Days } = generateMockData();

    const policyAnalytics = {
        overview: {
            totalPolicies: 25,
            activePolicies: 23,
            draftPolicies: 2,
            archivedPolicies: 8,
            acknowledgmentRate: 96.7
        },
        acknowledgments: {
            total: 575,
            completed: 556,
            pending: 19,
            overdue: 12,
            trends: last30Days.map(d => ({
                date: d.date,
                acknowledgments: Math.floor(d.value * 0.8)
            }))
        },
        byCategory: [
            { category: 'Data Protection', policies: 5, acknowledgmentRate: 98.2 },
            { category: 'Financial Compliance', policies: 7, acknowledgmentRate: 95.8 },
            { category: 'HR Policies', policies: 4, acknowledgmentRate: 97.5 },
            { category: 'IT Security', policies: 6, acknowledgmentRate: 94.3 },
            { category: 'Operational', policies: 3, acknowledgmentRate: 99.1 }
        ],
        compliance: {
            riskLevels: [
                { level: 'Low Risk', count: 18, percentage: 72.0 },
                { level: 'Medium Risk', count: 6, percentage: 24.0 },
                { level: 'High Risk', count: 1, percentage: 4.0 }
            ],
            violations: {
                total: 8,
                resolved: 6,
                pending: 2,
                byCategory: [
                    { category: 'Data Protection', count: 3 },
                    { category: 'IT Security', count: 2 },
                    { category: 'Financial Compliance', count: 2 },
                    { category: 'HR Policies', count: 1 }
                ]
            }
        },
        updates: {
            recentUpdates: 5,
            scheduledReviews: 8,
            overdueReviews: 2,
            updateFrequency: last30Days.map(d => ({
                date: d.date,
                updates: Math.floor(Math.random() * 2)
            }))
        }
    };

    res.json({
        success: true,
        policyAnalytics,
        filters: { category, timeframe },
        generatedAt: new Date().toISOString()
    });
});

// Get training analytics
router.get('/training', (req, res) => {
    const { course, department } = req.query;
    const { last30Days } = generateMockData();

    const trainingAnalytics = {
        overview: {
            totalCourses: 12,
            activeCourses: 10,
            completedCourses: 8,
            totalEnrollments: 1800,
            completionRate: 87.5,
            averageScore: 85.7
        },
        progress: {
            completed: 1575,
            inProgress: 135,
            notStarted: 90,
            trends: last30Days.map(d => ({
                date: d.date,
                completions: Math.floor(d.value * 1.5)
            }))
        },
        performance: {
            averageScores: [
                { course: 'Data Protection Fundamentals', score: 87.5, participants: 150 },
                { course: 'Anti-Money Laundering', score: 84.2, participants: 145 },
                { course: 'Code of Conduct', score: 92.1, participants: 150 },
                { course: 'Cybersecurity Awareness', score: 79.8, participants: 148 },
                { course: 'Workplace Safety', score: 88.7, participants: 150 }
            ],
            passRates: [
                { course: 'Data Protection Fundamentals', rate: 95.2 },
                { course: 'Anti-Money Laundering', rate: 89.7 },
                { course: 'Code of Conduct', rate: 97.8 },
                { course: 'Cybersecurity Awareness', rate: 82.4 },
                { course: 'Workplace Safety', rate: 91.3 }
            ]
        },
        engagement: {
            timeSpent: {
                average: 48.5, // minutes per course
                total: 87300, // total minutes across all users
                byDepartment: [
                    { department: 'Finance', avgMinutes: 52.3 },
                    { department: 'IT', avgMinutes: 45.7 },
                    { department: 'HR', avgMinutes: 49.8 },
                    { department: 'Operations', avgMinutes: 46.2 },
                    { department: 'Legal', avgMinutes: 54.1 },
                    { department: 'Compliance', avgMinutes: 58.9 }
                ]
            },
            retakeRates: [
                { course: 'Data Protection Fundamentals', rate: 8.7 },
                { course: 'Anti-Money Laundering', rate: 15.2 },
                { course: 'Code of Conduct', rate: 4.3 },
                { course: 'Cybersecurity Awareness', rate: 22.1 },
                { course: 'Workplace Safety', rate: 6.8 }
            ]
        },
        certificates: {
            issued: 1245,
            pending: 87,
            expired: 23,
            renewalsDue: 156,
            byDepartment: [
                { department: 'Finance', issued: 298 },
                { department: 'IT', issued: 245 },
                { department: 'HR', issued: 189 },
                { department: 'Operations', issued: 267 },
                { department: 'Legal', issued: 134 },
                { department: 'Compliance', issued: 112 }
            ]
        }
    };

    res.json({
        success: true,
        trainingAnalytics,
        filters: { course, department },
        generatedAt: new Date().toISOString()
    });
});

// Get risk analytics
router.get('/risk', (req, res) => {
    const { category, severity } = req.query;
    const { last30Days } = generateMockData();

    const riskAnalytics = {
        overview: {
            overallRiskScore: 23.5, // Lower is better
            riskLevel: 'Low',
            totalRisks: 45,
            highRisks: 3,
            mediumRisks: 12,
            lowRisks: 30
        },
        categories: [
            { category: 'Operational', score: 28.3, level: 'Medium', count: 12 },
            { category: 'Compliance', score: 15.7, level: 'Low', count: 8 },
            { category: 'Financial', score: 22.1, level: 'Low', count: 10 },
            { category: 'Reputational', score: 31.2, level: 'Medium', count: 7 },
            { category: 'Technology', score: 26.8, level: 'Medium', count: 8 }
        ],
        trends: {
            riskScore: last30Days.map(d => ({
                date: d.date,
                score: Math.max(15, Math.min(35, 23.5 + (Math.random() - 0.5) * 8))
            })),
            newRisks: last30Days.map(d => ({
                date: d.date,
                count: Math.floor(Math.random() * 3)
            })),
            resolvedRisks: last30Days.map(d => ({
                date: d.date,
                count: Math.floor(Math.random() * 2)
            }))
        },
        mitigation: {
            totalActions: 67,
            completedActions: 52,
            pendingActions: 15,
            overdueActions: 8,
            effectiveness: 78.2 // percentage
        },
        predictions: {
            nextMonthRisk: 21.8,
            trendDirection: 'decreasing',
            confidence: 85.3,
            recommendations: [
                'Increase cybersecurity training frequency',
                'Review operational procedures in Finance department',
                'Update incident response protocols',
                'Enhance vendor risk assessment process'
            ]
        }
    };

    res.json({
        success: true,
        riskAnalytics,
        filters: { category, severity },
        generatedAt: new Date().toISOString()
    });
});

// Export analytics data
router.post('/export', (req, res) => {
    const { type, format = 'json', dateRange } = req.body;

    // Simulate export process
    const exportId = Math.random().toString(36).substr(2, 9);
    
    res.json({
        success: true,
        message: 'Export initiated',
        exportId,
        estimatedTime: '2-3 minutes',
        downloadUrl: `/api/analytics/exports/${exportId}`,
        format,
        type
    });
});

// Get export status
router.get('/exports/:exportId', (req, res) => {
    const { exportId } = req.params;

    // Simulate export completion
    res.json({
        success: true,
        exportId,
        status: 'completed',
        downloadUrl: `/api/analytics/exports/${exportId}/download`,
        fileSize: '2.4 MB',
        createdAt: new Date().toISOString()
    });
});

module.exports = router;