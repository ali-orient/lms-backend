const express = require('express');
const router = express.Router();

// Mock reports data
let reports = [
    {
        id: 1,
        title: 'Monthly Compliance Report - January 2024',
        type: 'compliance',
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'completed',
        generatedBy: 'System',
        generatedAt: '2024-02-01T09:00:00Z',
        data: {
            totalPolicies: 25,
            acknowledgedPolicies: 23,
            pendingAcknowledgments: 2,
            trainingCompletionRate: 87.5,
            totalEmployees: 150,
            trainedEmployees: 131,
            incidentReports: 3,
            resolvedIncidents: 2,
            complianceScore: 92.3
        },
        downloadUrl: '/api/reports/1/download',
        createdAt: '2024-02-01T09:00:00Z'
    },
    {
        id: 2,
        title: 'Training Progress Report - Q1 2024',
        type: 'training',
        period: 'quarterly',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        status: 'in_progress',
        generatedBy: 'Training Manager',
        generatedAt: null,
        data: {
            totalCourses: 12,
            completedCourses: 8,
            inProgressCourses: 3,
            notStartedCourses: 1,
            averageScore: 85.2,
            totalParticipants: 150,
            activeParticipants: 142,
            certificatesIssued: 98
        },
        downloadUrl: null,
        createdAt: '2024-03-15T14:30:00Z'
    },
    {
        id: 3,
        title: 'Policy Acknowledgment Report - February 2024',
        type: 'policy',
        period: 'monthly',
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        status: 'completed',
        generatedBy: 'Compliance Officer',
        generatedAt: '2024-03-01T10:15:00Z',
        data: {
            newPolicies: 3,
            updatedPolicies: 5,
            totalAcknowledgments: 445,
            pendingAcknowledgments: 15,
            acknowledgmentRate: 96.7,
            overdueAcknowledgments: 8,
            exemptedEmployees: 5
        },
        downloadUrl: '/api/reports/3/download',
        createdAt: '2024-03-01T10:15:00Z'
    }
];

// Mock incident reports
let incidentReports = [
    {
        id: 1,
        title: 'Data Access Violation',
        description: 'Unauthorized access attempt to customer database detected',
        category: 'security',
        severity: 'high',
        status: 'resolved',
        reportedBy: 'IT Security Team',
        reportedAt: '2024-01-15T14:30:00Z',
        assignedTo: 'Security Manager',
        resolvedAt: '2024-01-16T09:45:00Z',
        resolution: 'Access permissions reviewed and updated. Additional security training scheduled.',
        affectedSystems: ['Customer Database', 'CRM System'],
        rootCause: 'Misconfigured access permissions',
        preventiveMeasures: [
            'Implement quarterly access reviews',
            'Enhanced monitoring alerts',
            'Additional security training'
        ],
        attachments: [
            { name: 'Security Log.txt', url: '/assets/incidents/security-log-001.txt' }
        ],
        createdAt: '2024-01-15T14:30:00Z',
        updatedAt: '2024-01-16T09:45:00Z'
    },
    {
        id: 2,
        title: 'Policy Violation - Confidential Information Sharing',
        description: 'Employee shared confidential client information via unsecured email',
        category: 'policy',
        severity: 'medium',
        status: 'investigating',
        reportedBy: 'Compliance Team',
        reportedAt: '2024-02-10T11:20:00Z',
        assignedTo: 'HR Manager',
        resolvedAt: null,
        resolution: null,
        affectedSystems: ['Email System'],
        rootCause: 'Under investigation',
        preventiveMeasures: [],
        attachments: [],
        createdAt: '2024-02-10T11:20:00Z',
        updatedAt: '2024-02-12T16:30:00Z'
    }
];

// Get all reports
router.get('/', (req, res) => {
    const { type, status, period } = req.query;
    let filteredReports = [...reports];

    if (type) {
        filteredReports = filteredReports.filter(r => r.type === type);
    }
    if (status) {
        filteredReports = filteredReports.filter(r => r.status === status);
    }
    if (period) {
        filteredReports = filteredReports.filter(r => r.period === period);
    }

    // Sort by creation date (newest first)
    filteredReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
        success: true,
        reports: filteredReports
    });
});

// Get report by ID
router.get('/:id', (req, res) => {
    const reportId = parseInt(req.params.id);
    const report = reports.find(r => r.id === reportId);

    if (!report) {
        return res.status(404).json({
            success: false,
            message: 'Report not found'
        });
    }

    res.json({
        success: true,
        report
    });
});

// Generate new report
router.post('/generate', (req, res) => {
    const {
        title,
        type,
        period,
        startDate,
        endDate,
        parameters
    } = req.body;

    const newReport = {
        id: reports.length + 1,
        title,
        type,
        period,
        startDate,
        endDate,
        status: 'generating',
        generatedBy: 'Current User', // In real app, get from JWT
        generatedAt: null,
        data: null,
        downloadUrl: null,
        createdAt: new Date().toISOString()
    };

    reports.push(newReport);

    // Simulate report generation
    setTimeout(() => {
        const reportIndex = reports.findIndex(r => r.id === newReport.id);
        if (reportIndex !== -1) {
            reports[reportIndex].status = 'completed';
            reports[reportIndex].generatedAt = new Date().toISOString();
            reports[reportIndex].downloadUrl = `/api/reports/${newReport.id}/download`;
            
            // Mock data based on report type
            if (type === 'compliance') {
                reports[reportIndex].data = {
                    totalPolicies: Math.floor(Math.random() * 30) + 20,
                    acknowledgedPolicies: Math.floor(Math.random() * 25) + 18,
                    pendingAcknowledgments: Math.floor(Math.random() * 5) + 1,
                    trainingCompletionRate: Math.floor(Math.random() * 20) + 80,
                    complianceScore: Math.floor(Math.random() * 15) + 85
                };
            } else if (type === 'training') {
                reports[reportIndex].data = {
                    totalCourses: Math.floor(Math.random() * 10) + 8,
                    completedCourses: Math.floor(Math.random() * 8) + 5,
                    averageScore: Math.floor(Math.random() * 20) + 75,
                    certificatesIssued: Math.floor(Math.random() * 50) + 80
                };
            }
        }
    }, 3000); // Simulate 3 second generation time

    res.status(201).json({
        success: true,
        message: 'Report generation started',
        report: newReport
    });
});

// Download report
router.get('/:id/download', (req, res) => {
    const reportId = parseInt(req.params.id);
    const report = reports.find(r => r.id === reportId);

    if (!report) {
        return res.status(404).json({
            success: false,
            message: 'Report not found'
        });
    }

    if (report.status !== 'completed') {
        return res.status(400).json({
            success: false,
            message: 'Report is not ready for download'
        });
    }

    // In a real application, this would generate and return the actual file
    res.json({
        success: true,
        message: 'Report download initiated',
        downloadUrl: report.downloadUrl,
        format: 'PDF',
        size: '2.3 MB'
    });
});

// Get all incident reports
router.get('/incidents/all', (req, res) => {
    const { category, severity, status } = req.query;
    let filteredIncidents = [...incidentReports];

    if (category) {
        filteredIncidents = filteredIncidents.filter(i => i.category === category);
    }
    if (severity) {
        filteredIncidents = filteredIncidents.filter(i => i.severity === severity);
    }
    if (status) {
        filteredIncidents = filteredIncidents.filter(i => i.status === status);
    }

    // Sort by reported date (newest first)
    filteredIncidents.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

    res.json({
        success: true,
        incidents: filteredIncidents
    });
});

// Get incident report by ID
router.get('/incidents/:id', (req, res) => {
    const incidentId = parseInt(req.params.id);
    const incident = incidentReports.find(i => i.id === incidentId);

    if (!incident) {
        return res.status(404).json({
            success: false,
            message: 'Incident report not found'
        });
    }

    res.json({
        success: true,
        incident
    });
});

// Create new incident report
router.post('/incidents', (req, res) => {
    const {
        title,
        description,
        category,
        severity,
        affectedSystems,
        attachments
    } = req.body;

    const newIncident = {
        id: incidentReports.length + 1,
        title,
        description,
        category,
        severity: severity || 'medium',
        status: 'reported',
        reportedBy: 'Current User', // In real app, get from JWT
        reportedAt: new Date().toISOString(),
        assignedTo: null,
        resolvedAt: null,
        resolution: null,
        affectedSystems: affectedSystems || [],
        rootCause: 'Under investigation',
        preventiveMeasures: [],
        attachments: attachments || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    incidentReports.push(newIncident);

    res.status(201).json({
        success: true,
        message: 'Incident report created successfully',
        incident: newIncident
    });
});

// Update incident report
router.put('/incidents/:id', (req, res) => {
    const incidentId = parseInt(req.params.id);
    const incidentIndex = incidentReports.findIndex(i => i.id === incidentId);

    if (incidentIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Incident report not found'
        });
    }

    const {
        status,
        assignedTo,
        resolution,
        rootCause,
        preventiveMeasures
    } = req.body;

    if (status) incidentReports[incidentIndex].status = status;
    if (assignedTo) incidentReports[incidentIndex].assignedTo = assignedTo;
    if (resolution) incidentReports[incidentIndex].resolution = resolution;
    if (rootCause) incidentReports[incidentIndex].rootCause = rootCause;
    if (preventiveMeasures) incidentReports[incidentIndex].preventiveMeasures = preventiveMeasures;

    if (status === 'resolved' && !incidentReports[incidentIndex].resolvedAt) {
        incidentReports[incidentIndex].resolvedAt = new Date().toISOString();
    }

    incidentReports[incidentIndex].updatedAt = new Date().toISOString();

    res.json({
        success: true,
        message: 'Incident report updated successfully',
        incident: incidentReports[incidentIndex]
    });
});

// Get dashboard analytics
router.get('/analytics/dashboard', (req, res) => {
    const { period = '30' } = req.query; // days

    // Mock analytics data
    const analytics = {
        summary: {
            totalReports: reports.length,
            completedReports: reports.filter(r => r.status === 'completed').length,
            pendingReports: reports.filter(r => r.status === 'in_progress').length,
            totalIncidents: incidentReports.length,
            openIncidents: incidentReports.filter(i => i.status !== 'resolved').length,
            resolvedIncidents: incidentReports.filter(i => i.status === 'resolved').length
        },
        trends: {
            reportGeneration: [
                { date: '2024-01-01', count: 5 },
                { date: '2024-01-15', count: 8 },
                { date: '2024-02-01', count: 12 },
                { date: '2024-02-15', count: 7 },
                { date: '2024-03-01', count: 10 }
            ],
            incidentReporting: [
                { date: '2024-01-01', count: 2 },
                { date: '2024-01-15', count: 1 },
                { date: '2024-02-01', count: 3 },
                { date: '2024-02-15', count: 2 },
                { date: '2024-03-01', count: 1 }
            ]
        },
        categories: {
            reportTypes: [
                { type: 'compliance', count: 8 },
                { type: 'training', count: 5 },
                { type: 'policy', count: 4 },
                { type: 'audit', count: 3 }
            ],
            incidentCategories: [
                { category: 'security', count: 5 },
                { category: 'policy', count: 3 },
                { category: 'operational', count: 2 },
                { category: 'regulatory', count: 1 }
            ]
        }
    };

    res.json({
        success: true,
        analytics,
        period: `${period} days`
    });
});

module.exports = router;