const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole, requireCompliance, auditLog, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const systemFilesDir = path.join(uploadsDir, 'system-files');
const policiesDir = path.join(uploadsDir, 'policies');

[uploadsDir, systemFilesDir, policiesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Simple persistence for uploaded files to survive server restarts
const filesIndexPath = path.join(uploadsDir, 'files-index.json');

const detectMimeType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.pdf': return 'application/pdf';
        case '.txt': return 'text/plain';
        case '.doc': return 'application/msword';
        case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.xls': return 'application/vnd.ms-excel';
        case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case '.ppt': return 'application/vnd.ms-powerpoint';
        case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        default: return 'application/octet-stream';
    }
};

const buildIndexFromDisk = () => {
    const entries = [];
    const addDir = (dirPath, category) => {
        if (!fs.existsSync(dirPath)) return;
        const filesInDir = fs.readdirSync(dirPath);
        filesInDir.forEach((fn) => {
            const abs = path.join(dirPath, fn);
            const stat = fs.statSync(abs);
            if (!stat.isFile()) return;
            entries.push({
                id: entries.length + 1,
                originalName: fn,
                filename: fn,
                path: `/uploads/${category === 'policy' ? 'policies' : 'system-files'}/${fn}`,
                size: stat.size,
                mimetype: detectMimeType(fn),
                category: category,
                uploadedBy: 'system',
                uploadedAt: new Date(stat.mtimeMs).toISOString(),
                description: ''
            });
        });
    };
    addDir(policiesDir, 'policy');
    addDir(systemFilesDir, 'system');
    return entries;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine upload directory based on file type or request
        const uploadPath = req.body.category === 'policy' ? policiesDir : systemFilesDir;
        cb(null, uploadPath);
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
        // Check file type
        const allowedTypes = /\.(pdf|doc|docx|txt|xlsx|xls|ppt|pptx)$/i;
        const extname = allowedTypes.test(path.extname(file.originalname));
        const mimetype = /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-(excel|powerpoint))|text\/plain)$/.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only document files (PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX) are allowed!'));
        }
    }
});

// Mock file storage (in production, use database)
let files = [
    {
        id: 1,
        originalName: 'Document1.pdf',
        filename: 'Document1-1759814237269-785724490.pdf',
        path: '/uploads/system-files/Document1-1759814237269-785724490.pdf',
        size: 2048576,
        mimetype: 'application/pdf',
        category: 'system',
        uploadedBy: 'admin',
        uploadedAt: '2024-01-01T00:00:00Z',
        description: 'Sample PDF document for testing'
    },
    {
        id: 2,
        originalName: 'Business Requirements Document - Compliance Module.docx',
        filename: 'Business Requirements Document - Compliance Module-1759810927557-324132051.docx',
        path: '/uploads/system-files/Business Requirements Document - Compliance Module-1759810927557-324132051.docx',
        size: 1024768,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        category: 'system',
        uploadedBy: 'compliance',
        uploadedAt: '2024-01-02T00:00:00Z',
        description: 'Business requirements for compliance module'
    },
    {
        id: 3,
        originalName: 'Pull API Documentation dubizzle.pdf',
        filename: 'Pull API Documentation dubizzle-1759759026600-835110238.pdf',
        path: '/uploads/system-files/Pull API Documentation dubizzle-1759759026600-835110238.pdf',
        size: 1536000,
        mimetype: 'application/pdf',
        category: 'system',
        uploadedBy: 'admin',
        uploadedAt: '2024-01-03T00:00:00Z',
        description: 'API documentation for dubizzle integration'
    }
];

// Initialize files from persistent index if available; otherwise create index
try {
    if (fs.existsSync(filesIndexPath)) {
        const loaded = JSON.parse(fs.readFileSync(filesIndexPath, 'utf-8'));
        if (Array.isArray(loaded) && loaded.length >= 0) {
            files = loaded;
        }
    } else {
        // Build an index from disk so previously uploaded files remain accessible
        const diskIndex = buildIndexFromDisk();
        if (diskIndex.length) {
            files = diskIndex;
        }
        fs.writeFileSync(filesIndexPath, JSON.stringify(files, null, 2));
    }
} catch (e) {
    console.error('Failed to initialize files index:', e);
}

// Upload file endpoint
router.post('/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }

    const newFile = {
        id: files.length + 1,
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/${req.body.category === 'policy' ? 'policies' : 'system-files'}/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category: req.body.category || 'system',
        uploadedBy: req.user.username,
        uploadedAt: new Date().toISOString(),
        description: req.body.description || ''
    };

    files.push(newFile);
    // Persist index after upload
    try {
        fs.writeFileSync(filesIndexPath, JSON.stringify(files, null, 2));
    } catch (e) {
        console.error('Failed to persist files index after upload:', e);
    }

    // Log the upload activity
    auditLog(req.user.id, 'file_upload', `Uploaded file: ${req.file.originalname}`);

    res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        file: newFile
    });
}));

// Get all files
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    let filteredFiles = [...files];

    if (category) {
        filteredFiles = filteredFiles.filter(file => file.category === category);
    }

    if (search) {
        filteredFiles = filteredFiles.filter(file => 
            file.originalName.toLowerCase().includes(search.toLowerCase()) ||
            file.description.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Sort by upload date (newest first)
    filteredFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
        success: true,
        files: filteredFiles
    });
}));

// Download file
router.get('/:id/download', authenticateToken, asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);

    if (!file) {
        return res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }

    const filePath = path.join(__dirname, '..', file.path);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            error: 'File not found on disk'
        });
    }

    // Log the download activity
    auditLog(req.user.id, 'file_download', `Downloaded file: ${file.originalName}`);

    res.download(filePath, file.originalName);
}));

// Delete file (compliance users only)
router.delete('/:id', authenticateToken, requireCompliance, asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const fileIndex = files.findIndex(f => f.id === fileId);

    if (fileIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }

    const file = files[fileIndex];
    const filePath = path.join(__dirname, '..', file.path);

    // Delete file from disk
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    // Remove from array
    files.splice(fileIndex, 1);

    // Persist index after delete
    try {
        fs.writeFileSync(filesIndexPath, JSON.stringify(files, null, 2));
    } catch (e) {
        console.error('Failed to persist files index after delete:', e);
    }

    // Log the deletion activity
    auditLog(req.user.id, 'file_delete', `Deleted file: ${file.originalName}`);

    res.json({
        success: true,
        message: 'File deleted successfully'
    });
}));

// Mock acknowledgments storage (in production, use database)
let acknowledgments = [];

// Custom authentication middleware for view endpoint that supports query token
const authenticateTokenForView = (req, res, next) => {
    // Try to get token from Authorization header first
    let token = req.headers['authorization'];
    if (token && token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
    } else {
        // If not in header, try query parameter
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    });
};

// View file (for preview in browser)
router.get('/:id/view', authenticateTokenForView, asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);

    if (!file) {
        return res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }

    const filePath = path.join(__dirname, '..', file.path);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            error: 'File not found on disk'
        });
    }

    // Set appropriate content type for viewing
    const ext = path.extname(file.filename).toLowerCase();
    let contentType = file.mimetype;
    
    if (ext === '.pdf') {
        contentType = 'application/pdf';
    } else if (ext === '.txt') {
        contentType = 'text/plain';
    } else if (ext === '.html' || ext === '.htm') {
        contentType = 'text/html';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    // Allow embedding in frontend dev and prod origins via CSP
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3002 http://localhost:3001");
    
    // Log the view activity
    auditLog(req.user.id, 'file_view', `Viewed file: ${file.originalName}`);

    res.sendFile(filePath);
}));

// Acknowledge file
router.post('/:id/acknowledge', authenticateToken, asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);

    if (!file) {
        return res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }

    const userId = req.user.id;
    const username = req.body.username || req.user.username;

    // Check if already acknowledged
    const existingAck = acknowledgments.find(a => a.userId === userId && a.fileId === fileId);
    if (existingAck) {
        return res.status(400).json({
            success: false,
            error: 'File already acknowledged'
        });
    }

    // Add acknowledgment
    const acknowledgment = {
        id: acknowledgments.length + 1,
        userId,
        username,
        fileId,
        fileName: file.originalName,
        acknowledgedAt: new Date().toISOString()
    };

    acknowledgments.push(acknowledgment);

    // Log the acknowledgment activity
    auditLog(req.user.id, 'file_acknowledge', `Acknowledged file: ${file.originalName}`);

    res.json({
        success: true,
        message: 'File acknowledged successfully',
        acknowledgment
    });
}));

// Get file acknowledgments (for compliance users)
router.get('/:id/acknowledgments', authenticateToken, requireCompliance, asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);

    if (!file) {
        return res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }

    const fileAcks = acknowledgments.filter(a => a.fileId === fileId);

    res.json({
        success: true,
        file: file.originalName,
        acknowledgments: fileAcks,
        totalAcknowledgments: fileAcks.length
    });
}));

// Get user's acknowledgments
router.get('/acknowledgments/my', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userAcks = acknowledgments.filter(a => a.userId === userId);

    res.json({
        success: true,
        acknowledgments: userAcks
    });
}));

// Get file info
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);

    if (!file) {
        return res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }

    res.json({
        success: true,
        file
    });
}));

// Generate temporary public access URL for Office documents
router.get('/:id/public-url', authenticateToken, asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const file = files.find(f => f.id === fileId);

    if (!file) {
        return res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }

    // Generate a temporary token valid for 1 hour
    const jwt = require('jsonwebtoken');
    const tempToken = jwt.sign(
        { fileId: fileId, userId: req.user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
    );

    // Create public access URL
    const publicUrl = `${req.protocol}://${req.get('host')}/api/files/${fileId}/public-view?token=${tempToken}`;

    res.json({
        success: true,
        publicUrl
    });
}));

// Public view endpoint for temporary access (used by external viewers)
router.get('/:id/public-view', asyncHandler(async (req, res) => {
    const fileId = parseInt(req.params.id);
    const token = req.query.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    const jwt = require('jsonwebtoken');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        if (decoded.fileId !== fileId) {
            return res.status(403).json({
                success: false,
                message: 'Invalid token for this file'
            });
        }

        const file = files.find(f => f.id === fileId);
        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        const filePath = path.join(__dirname, '..', file.path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found on disk'
            });
        }

        // Set appropriate content type
        const ext = path.extname(file.filename).toLowerCase();
        let contentType = file.mimetype;
        
        if (ext === '.docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (ext === '.doc') {
            contentType = 'application/msword';
        } else if (ext === '.xlsx') {
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (ext === '.xls') {
            contentType = 'application/vnd.ms-excel';
        } else if (ext === '.pptx') {
            contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        } else if (ext === '.ppt') {
            contentType = 'application/vnd.ms-powerpoint';
        }

        res.setHeader('Content-Type', contentType);
        
        // For Office documents, set headers to encourage browser viewing
        if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext.substring(1))) {
            res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
            res.setHeader('X-Content-Type-Options', 'nosniff');
        } else {
            res.setHeader('Content-Disposition', 'inline');
        }
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        
        // Log the view activity
        auditLog(decoded.userId, 'file_public_view', `Public viewed file: ${file.originalName}`);

        res.sendFile(filePath);

    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
}));

module.exports = router;