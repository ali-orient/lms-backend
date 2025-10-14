const express = require('express');
const router = express.Router();

// Mock policies data
let policies = [
    {
        id: 1,
        title: 'Code of Conduct',
        description: 'Company-wide code of conduct and ethical guidelines',
        category: 'Ethics',
        version: '2.1',
        effectiveDate: '2024-01-01',
        expiryDate: '2025-12-31',
        status: 'active',
        mandatory: true,
        content: 'This policy outlines the expected behavior and ethical standards for all Orient employees...',
        createdBy: 'Compliance Team',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 2,
        title: 'Data Protection Policy',
        description: 'Guidelines for handling and protecting sensitive data',
        category: 'Security',
        version: '1.5',
        effectiveDate: '2024-02-01',
        expiryDate: '2025-12-31',
        status: 'active',
        mandatory: true,
        content: 'This policy establishes guidelines for the collection, use, and protection of personal and sensitive data...',
        createdBy: 'IT Security',
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z'
    },
    {
        id: 3,
        title: 'Anti-Money Laundering (AML)',
        description: 'Procedures for preventing money laundering activities',
        category: 'Compliance',
        version: '3.0',
        effectiveDate: '2024-03-01',
        expiryDate: '2025-12-31',
        status: 'active',
        mandatory: true,
        content: 'This policy outlines procedures to prevent, detect, and report money laundering activities...',
        createdBy: 'Compliance Team',
        createdAt: '2024-03-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z'
    }
];

// Mock acknowledgments
let acknowledgments = [
    { userId: 1, policyId: 1, acknowledgedAt: '2024-01-15T10:30:00Z' },
    { userId: 1, policyId: 2, acknowledgedAt: '2024-02-15T14:20:00Z' },
    { userId: 2, policyId: 1, acknowledgedAt: '2024-01-20T09:15:00Z' }
];

// Get all policies
router.get('/', (req, res) => {
    const { category, status, mandatory } = req.query;
    let filteredPolicies = [...policies];

    if (category) {
        filteredPolicies = filteredPolicies.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (status) {
        filteredPolicies = filteredPolicies.filter(p => p.status === status);
    }
    if (mandatory !== undefined) {
        filteredPolicies = filteredPolicies.filter(p => p.mandatory === (mandatory === 'true'));
    }

    res.json({
        success: true,
        policies: filteredPolicies
    });
});

// Get policy by ID
router.get('/:id', (req, res) => {
    const policyId = parseInt(req.params.id);
    const policy = policies.find(p => p.id === policyId);

    if (!policy) {
        return res.status(404).json({
            success: false,
            message: 'Policy not found'
        });
    }

    res.json({
        success: true,
        policy
    });
});

// Create new policy (compliance only)
router.post('/', (req, res) => {
    const {
        title,
        description,
        category,
        version,
        effectiveDate,
        expiryDate,
        mandatory,
        content
    } = req.body;

    const newPolicy = {
        id: policies.length + 1,
        title,
        description,
        category,
        version: version || '1.0',
        effectiveDate,
        expiryDate,
        status: 'active',
        mandatory: mandatory || false,
        content,
        createdBy: 'Compliance Team', // In real app, get from JWT
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    policies.push(newPolicy);

    res.status(201).json({
        success: true,
        message: 'Policy created successfully',
        policy: newPolicy
    });
});

// Update policy (compliance only)
router.put('/:id', (req, res) => {
    const policyId = parseInt(req.params.id);
    const policyIndex = policies.findIndex(p => p.id === policyId);

    if (policyIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Policy not found'
        });
    }

    const updatedPolicy = {
        ...policies[policyIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
    };

    policies[policyIndex] = updatedPolicy;

    res.json({
        success: true,
        message: 'Policy updated successfully',
        policy: updatedPolicy
    });
});

// Acknowledge policy
router.post('/:id/acknowledge', (req, res) => {
    const policyId = parseInt(req.params.id);
    const userId = 1; // In real app, get from JWT token
    
    const policy = policies.find(p => p.id === policyId);
    if (!policy) {
        return res.status(404).json({
            success: false,
            message: 'Policy not found'
        });
    }

    // Check if already acknowledged
    const existingAck = acknowledgments.find(a => a.userId === userId && a.policyId === policyId);
    if (existingAck) {
        return res.status(400).json({
            success: false,
            message: 'Policy already acknowledged'
        });
    }

    // Add acknowledgment
    acknowledgments.push({
        userId,
        policyId,
        acknowledgedAt: new Date().toISOString()
    });

    res.json({
        success: true,
        message: 'Policy acknowledged successfully'
    });
});

// Get policy acknowledgments (compliance only)
router.get('/:id/acknowledgments', (req, res) => {
    const policyId = parseInt(req.params.id);
    const policyAcks = acknowledgments.filter(a => a.policyId === policyId);

    res.json({
        success: true,
        acknowledgments: policyAcks
    });
});

module.exports = router;