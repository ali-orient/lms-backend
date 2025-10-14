const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { authenticateToken, requireRole } = require('../middleware/auth');
const Training = require('../models/Training');

// Directory to store training PDF materials
const materialsDir = path.join(__dirname, '../../uploads/training-materials');

// Ensure directory exists
if (!fs.existsSync(materialsDir)) {
  fs.mkdirSync(materialsDir, { recursive: true });
}

// Multer storage for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, materialsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    cb(null, `${timestamp}-${safeName}`);
  }
});

const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Admin: Upload PDF material for a training
router.post('/:id/upload', authenticateToken, requireRole(['admin']), upload.single('file'), async (req, res) => {
  try {
    const trainingId = req.params.id;
    const training = await Training.findById(trainingId);
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const publicUrl = `/api/training-materials/file/${trainingId}/${req.file.filename}`;

    // Initialize materials array if missing
    if (!training.content) training.content = {};
    if (!Array.isArray(training.content.materials)) training.content.materials = [];

    training.content.materials.push({
      name: req.file.originalname,
      url: publicUrl,
      type: 'pdf'
    });

    training.updatedBy = req.user.id;
    await training.save();

    res.status(201).json({
      message: 'PDF uploaded successfully',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        url: publicUrl
      },
      trainingId
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Auth: List PDF materials for a training (with audience access control)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const trainingId = req.params.id;
    const training = await Training.findById(trainingId);
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    // Admins can view always
    const user = req.user;
    const isAdmin = user.role === 'admin';

    // Audience checks for non-admins
    const isAudience = (
      training.targetAudience === 'all' ||
      (Array.isArray(training.departments) && training.departments.includes(user.department)) ||
      (Array.isArray(training.roles) && training.roles.includes(user.role))
    );

    if (!isAdmin && !isAudience) {
      return res.status(403).json({ message: 'Not authorized to view materials for this training' });
    }

    const pdfMaterials = (training.content?.materials || []).filter(m => m.type === 'pdf');
    res.json({ materials: pdfMaterials });
  } catch (error) {
    console.error('Error listing materials:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Auth: Serve a specific PDF file (with audience access control)
router.get('/file/:trainingId/:filename', authenticateToken, async (req, res) => {
  try {
    const { trainingId, filename } = req.params;
    const training = await Training.findById(trainingId);
    if (!training) {
      return res.status(404).json({ message: 'Training not found' });
    }

    const user = req.user;
    const isAdmin = user.role === 'admin';
    const isAudience = (
      training.targetAudience === 'all' ||
      (Array.isArray(training.departments) && training.departments.includes(user.department)) ||
      (Array.isArray(training.roles) && training.roles.includes(user.role))
    );

    if (!isAdmin && !isAudience) {
      return res.status(403).json({ message: 'Not authorized to access this material' });
    }

    const filePath = path.join(materialsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving material:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;