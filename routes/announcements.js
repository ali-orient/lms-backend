const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Create announcements uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const announcementsDir = path.join(uploadsDir, 'announcements');

[uploadsDir, announcementsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for announcements file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, announcementsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow only PDF and text files for announcements
        const allowedTypes = /\.(pdf|txt)$/i;
        const extname = allowedTypes.test(path.extname(file.originalname));
        const mimetype = /^(application\/pdf|text\/plain)$/.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF and text files are allowed for announcements!'));
        }
    }
});

// Mock announcements files storage
let announcementFiles = [];

// Mock announcements data
let announcements = [
    {
        id: 1,
        title: 'New Compliance Policy Updates',
        content: 'We have updated our compliance policies to align with the latest regulatory requirements. Please review the changes and acknowledge your understanding.',
        type: 'announcement',
        category: 'Policy Update',
        priority: 'high',
        status: 'published',
        publishedAt: '2024-01-15T09:00:00Z',
        expiresAt: '2024-12-31T23:59:59Z',
        targetAudience: 'all',
        author: 'Compliance Team',
        attachments: [
            { name: 'Policy Changes Summary.pdf', url: '/assets/docs/policy-changes-summary.pdf' }
        ],
        readBy: [1, 2], // User IDs who have read this
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-15T08:00:00Z'
    },
    {
        id: 2,
        title: 'Quarterly Compliance Training Reminder',
        content: 'This is a reminder that the quarterly compliance training is due by the end of this month. Please complete all assigned modules.',
        type: 'reminder',
        category: 'Training',
        priority: 'medium',
        status: 'published',
        publishedAt: '2024-02-01T10:00:00Z',
        expiresAt: '2024-02-28T23:59:59Z',
        targetAudience: 'employees',
        author: 'Training Department',
        attachments: [],
        readBy: [1],
        createdAt: '2024-02-01T09:30:00Z',
        updatedAt: '2024-02-01T09:30:00Z'
    },
    {
        id: 3,
        title: 'Security Incident Response Protocol',
        content: 'We have updated our security incident response protocol. All employees must familiarize themselves with the new procedures.',
        type: 'news',
        category: 'Security',
        priority: 'high',
        status: 'published',
        publishedAt: '2024-02-10T14:00:00Z',
        expiresAt: '2024-08-10T23:59:59Z',
        targetAudience: 'all',
        author: 'IT Security Team',
        attachments: [
            { name: 'Incident Response Guide.pdf', url: '/assets/docs/incident-response-guide.pdf' }
        ],
        readBy: [],
        createdAt: '2024-02-10T13:30:00Z',
        updatedAt: '2024-02-10T13:30:00Z'
    }
];

// Mock internal blogs
let blogs = [
    {
        id: 1,
        title: 'Best Practices for Data Protection in 2024',
        content: 'As we navigate the evolving landscape of data protection regulations, it\'s crucial to stay updated with best practices...',
        excerpt: 'Learn about the latest data protection best practices and how to implement them in your daily work.',
        author: 'Sarah Johnson, Compliance Officer',
        category: 'Data Protection',
        tags: ['data-protection', 'privacy', 'gdpr', 'best-practices'],
        status: 'published',
        publishedAt: '2024-01-20T11:00:00Z',
        readTime: 5, // minutes
        views: 156,
        likes: 23,
        comments: [
            {
                id: 1,
                author: 'John Doe',
                content: 'Very informative article. Thanks for sharing!',
                createdAt: '2024-01-21T09:15:00Z'
            }
        ],
        createdAt: '2024-01-20T10:30:00Z',
        updatedAt: '2024-01-20T10:30:00Z'
    },
    {
        id: 2,
        title: 'Understanding Anti-Money Laundering Regulations',
        content: 'Anti-Money Laundering (AML) regulations are critical for financial institutions. This blog post covers the key aspects...',
        excerpt: 'A comprehensive guide to understanding and implementing AML regulations in your organization.',
        author: 'Michael Chen, Legal Advisor',
        category: 'AML',
        tags: ['aml', 'regulations', 'compliance', 'financial-crimes'],
        status: 'published',
        publishedAt: '2024-02-05T15:30:00Z',
        readTime: 8,
        views: 89,
        likes: 15,
        comments: [],
        createdAt: '2024-02-05T14:45:00Z',
        updatedAt: '2024-02-05T14:45:00Z'
    }
];

// Get all announcements
router.get('/', (req, res) => {
    const { type, category, priority, status } = req.query;
    let filteredAnnouncements = [...announcements];

    if (type) {
        filteredAnnouncements = filteredAnnouncements.filter(c => c.type === type);
    }
    if (category) {
        filteredAnnouncements = filteredAnnouncements.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }
    if (priority) {
        filteredAnnouncements = filteredAnnouncements.filter(c => c.priority === priority);
    }
    if (status) {
        filteredAnnouncements = filteredAnnouncements.filter(c => c.status === status);
    }

    // Sort by published date (newest first)
    filteredAnnouncements.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.json({
        success: true,
        announcements: filteredAnnouncements
    });
});

// Upload announcement file (admin only)
// Upload announcement file (Admin/Compliance only)
router.post('/files/upload', authenticateToken, requireRole(['admin', 'compliance']), upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { title, description, category } = req.body;

        const newFile = {
            id: announcementFiles.length + 1,
            originalName: req.file.originalname,
            filename: req.file.filename,
            title: title || req.file.originalname,
            description: description || '',
            category: category || 'general',
            fileType: path.extname(req.file.originalname).toLowerCase(),
            fileSize: req.file.size,
            uploadedBy: req.user.name || req.user.email || 'Admin', // Get from JWT token
            uploadedByRole: req.user.role || 'admin',
            uploadedAt: new Date().toISOString(),
            isActive: true,
            downloadCount: 0,
            visibleToEmployees: true // Admin files are visible to all employees
        };

        announcementFiles.push(newFile);

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            file: newFile
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading file: ' + error.message
        });
    }
});

// Get all announcement files (visible to all authenticated users)
router.get('/files', authenticateToken, (req, res) => {
    const { category, fileType } = req.query;
    const userRole = req.user.role;
    
    // Filter files based on user role
    let filteredFiles = [...announcementFiles].filter(file => {
        if (!file.isActive) return false;
        
        // Admin and compliance can see all files
        if (userRole === 'admin' || userRole === 'compliance') {
            return true;
        }
        
        // Employees can see files that are marked as visible to employees
        // This includes all admin-uploaded files and their own files
        return file.visibleToEmployees === true || file.uploadedByRole === userRole;
    });

    if (category) {
        filteredFiles = filteredFiles.filter(f => f.category.toLowerCase() === category.toLowerCase());
    }
    if (fileType) {
        filteredFiles = filteredFiles.filter(f => f.fileType === fileType);
    }

    // Sort by upload date (newest first)
    filteredFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
        success: true,
        files: filteredFiles
    });
});

// Get single announcement file (with access control)
router.get('/files/:id', authenticateToken, (req, res) => {
    const fileId = parseInt(req.params.id);
    const userRole = req.user.role;
    const file = announcementFiles.find(f => f.id === fileId && f.isActive);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }

    // Check access permissions
    const hasAccess = (userRole === 'admin' || userRole === 'compliance') || 
                     file.visibleToEmployees === true || 
                     file.uploadedByRole === userRole;

    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    res.json({
        success: true,
        file
    });
});

// Download announcement file (with access control)
router.get('/files/:id/download', authenticateToken, (req, res) => {
    const fileId = parseInt(req.params.id);
    const userRole = req.user.role;
    const file = announcementFiles.find(f => f.id === fileId && f.isActive);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }

    // Check access permissions
    const hasAccess = (userRole === 'admin' || userRole === 'compliance') || 
                     file.visibleToEmployees === true || 
                     file.uploadedByRole === userRole;

    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    const filePath = path.join(announcementsDir, file.filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: 'File not found on server'
        });
    }

    // Increment download count
    file.downloadCount = (file.downloadCount || 0) + 1;

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(filePath);
});

// Get public URL for announcement file
router.get('/files/:id/public-url', (req, res) => {
    const fileId = parseInt(req.params.id);
    const file = announcementFiles.find(f => f.id === fileId && f.isActive);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }

    // Generate a temporary token (in real app, use JWT with expiration)
    const token = Buffer.from(`${fileId}-${Date.now()}`).toString('base64');
    const publicUrl = `http://localhost:3000/api/announcements/files/${fileId}/view?token=${token}`;

    res.json({
        success: true,
        publicUrl,
        downloadUrl: `http://localhost:3000/api/announcements/files/${fileId}/download`
    });
});

// View announcement file publicly
router.get('/files/:id/view', (req, res) => {
    const fileId = parseInt(req.params.id);
    const { token } = req.query;
    
    // Basic token validation (in real app, use proper JWT validation)
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    const file = announcementFiles.find(f => f.id === fileId && f.isActive);

    if (!file) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }

    const filePath = path.join(announcementsDir, file.filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: 'File not found on server'
        });
    }

    // CORS headers are handled by the main server configuration

    // Set appropriate content type
    const ext = path.extname(file.filename).toLowerCase();
    if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
    } else if (ext === '.txt') {
        res.setHeader('Content-Type', 'text/plain');
    }

    res.sendFile(filePath);
});

// Delete announcement file (Admin/Compliance only)
router.delete('/files/:id', authenticateToken, requireRole(['admin', 'compliance']), (req, res) => {
    const fileId = parseInt(req.params.id);
    const fileIndex = announcementFiles.findIndex(f => f.id === fileId);

    if (fileIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }

    // Soft delete - mark as inactive
    announcementFiles[fileIndex].isActive = false;

    res.json({
        success: true,
        message: 'File deleted successfully'
    });
});

// Get announcement by ID
router.get('/:id', (req, res) => {
    const announcementId = parseInt(req.params.id);
    const announcement = announcements.find(c => c.id === announcementId);

    if (!announcement) {
        return res.status(404).json({
            success: false,
            message: 'Announcement not found'
        });
    }

    res.json({
        success: true,
        announcement
    });
});

// Mark announcement as read
router.post('/:id/read', (req, res) => {
    const announcementId = parseInt(req.params.id);
    const userId = 1; // In real app, get from JWT token

    const announcementIndex = announcements.findIndex(c => c.id === announcementId);
    if (announcementIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Announcement not found'
        });
    }

    // Add user to readBy array if not already present
    if (!announcements[announcementIndex].readBy.includes(userId)) {
        announcements[announcementIndex].readBy.push(userId);
    }

    res.json({
        success: true,
        message: 'Announcement marked as read'
    });
});

// Create new announcement (compliance only)
router.post('/', (req, res) => {
    const {
        title,
        content,
        type,
        category,
        priority,
        targetAudience,
        expiresAt,
        attachments
    } = req.body;

    const newAnnouncement = {
        id: announcements.length + 1,
        title,
        content,
        type: type || 'announcement',
        category,
        priority: priority || 'medium',
        status: 'published',
        publishedAt: new Date().toISOString(),
        expiresAt,
        targetAudience: targetAudience || 'all',
        author: 'Compliance Team', // In real app, get from JWT
        attachments: attachments || [],
        readBy: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    announcements.push(newAnnouncement);

    res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        announcement: newAnnouncement
    });
});

// Get all blogs
router.get('/blogs/all', (req, res) => {
    const { category, author } = req.query;
    let filteredBlogs = [...blogs];

    if (category) {
        filteredBlogs = filteredBlogs.filter(b => b.category.toLowerCase() === category.toLowerCase());
    }
    if (author) {
        filteredBlogs = filteredBlogs.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
    }

    // Sort by published date (newest first)
    filteredBlogs.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.json({
        success: true,
        blogs: filteredBlogs
    });
});

// Get blog by ID
router.get('/blogs/:id', (req, res) => {
    const blogId = parseInt(req.params.id);
    const blog = blogs.find(b => b.id === blogId);

    if (!blog) {
        return res.status(404).json({
            success: false,
            message: 'Blog post not found'
        });
    }

    // Increment views
    blog.views++;

    res.json({
        success: true,
        blog
    });
});

// Like a blog post
router.post('/blogs/:id/like', (req, res) => {
    const blogId = parseInt(req.params.id);
    const blogIndex = blogs.findIndex(b => b.id === blogId);

    if (blogIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Blog post not found'
        });
    }

    blogs[blogIndex].likes++;

    res.json({
        success: true,
        message: 'Blog post liked',
        likes: blogs[blogIndex].likes
    });
});

// Add comment to blog post
router.post('/blogs/:id/comments', (req, res) => {
    const blogId = parseInt(req.params.id);
    const { content } = req.body;
    const blogIndex = blogs.findIndex(b => b.id === blogId);

    if (blogIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Blog post not found'
        });
    }

    const newComment = {
        id: blogs[blogIndex].comments.length + 1,
        author: 'Current User', // In real app, get from JWT
        content,
        createdAt: new Date().toISOString()
    };

    blogs[blogIndex].comments.push(newComment);

    res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        comment: newComment
    });
});

module.exports = router;