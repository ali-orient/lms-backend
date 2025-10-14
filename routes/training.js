const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole, requireCompliance } = require('../middleware/auth');
const Training = require('../models/Training');
const TrainingProgress = require('../models/TrainingProgress');
const Certificate = require('../models/Certificate');
const router = express.Router();

// Create uploads directory for training videos
const uploadsDir = path.join(__dirname, '../uploads');
const trainingDir = path.join(uploadsDir, 'training');

[uploadsDir, trainingDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, trainingDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `training-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for videos
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only video files are allowed (mp4, avi, mov, wmv, flv, webm, mkv)'));
        }
    }
});

// Helper function to extract YouTube video ID
function extractYouTubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ============= ADMIN ENDPOINTS =============

// Create new training course (Admin only)
router.post('/', authenticateToken, requireCompliance, upload.single('video'), async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            duration,
            type,
            mandatory,
            deadline,
            youtubeUrl,
            targetAudience,
            departments,
            roles,
            quiz,
            status
        } = req.body;

        // Validate required fields
        if (!title || !description || !category || !type) {
            return res.status(400).json({ 
                message: 'Missing required fields: title, description, category, type' 
            });
        }

        // Validate duration
        const durationInt = parseInt(duration);
        if (!Number.isFinite(durationInt) || durationInt < 1) {
            return res.status(400).json({ message: 'Duration must be at least 1 minute' });
        }

        // Validate training type and content
        let content = {};
        
        if (type === 'video' && req.file) {
            // Handle uploaded video
            content.uploadedVideo = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                size: req.file.size,
                mimetype: req.file.mimetype
            };
            // Also populate schema-aligned fields
            content.videoFilename = req.file.filename;
            content.videoSize = req.file.size;
            content.videoUrl = `/api/training/video/${req.file.filename}`;
        } else if (type === 'youtube' && youtubeUrl) {
            // Handle YouTube URL
            const videoId = extractYouTubeVideoId(youtubeUrl);
            if (!videoId) {
                return res.status(400).json({ message: 'Invalid YouTube URL' });
            }
            // Populate schema-aligned fields
            content.youtubeUrl = youtubeUrl;
            content.youtubeVideoId = videoId;
        } else {
            return res.status(400).json({ 
                message: 'Invalid content: provide either video file or YouTube URL based on type' 
            });
        }

        // Parse quiz if provided
        let parsedQuiz = null;
        if (quiz) {
            try {
                parsedQuiz = typeof quiz === 'string' ? JSON.parse(quiz) : quiz;
            } catch (error) {
                return res.status(400).json({ message: 'Invalid quiz format' });
            }
        }

        // Create training document - only include quiz if it has questions
        const trainingData = {
            title,
            description,
            category,
            duration: durationInt,
            type,
            mandatory: mandatory === 'true' || mandatory === true,
            deadline: deadline ? new Date(deadline) : null,
            content,
            status: status || 'draft',
            targetAudience: targetAudience || 'all',
            departments: departments ? departments.split(',').map(d => d.trim()) : [],
            roles: roles ? roles.split(',').map(r => r.trim()) : [],
            createdBy: req.user.userId,
            updatedBy: req.user.userId
        };

        // Only add quiz if it has questions
        if (parsedQuiz && parsedQuiz.questions && parsedQuiz.questions.length > 0) {
            trainingData.quiz = parsedQuiz;
        }

        const training = new Training(trainingData);

        await training.save();

        res.status(201).json({
            message: 'Training course created successfully',
            training
        });
    } catch (error) {
        console.error('Error creating training:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation error', error: error.message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all trainings (Admin view with full details)
router.get('/admin/all', authenticateToken, requireCompliance, async (req, res) => {
    try {
        const trainings = await Training.find()
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email')
            .sort({ createdAt: -1 });

        res.json(trainings);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update training course (Admin only)
router.put('/:id', authenticateToken, requireCompliance, upload.single('video'), async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        const {
            title,
            description,
            category,
            duration,
            type,
            mandatory,
            deadline,
            youtubeUrl,
            targetAudience,
            departments,
            roles,
            quiz,
            status
        } = req.body;

        // Update basic fields
        if (title) training.title = title;
        if (description) training.description = description;
        if (category) training.category = category;
        if (duration) training.duration = parseInt(duration);
        if (type) training.type = type;
        if (mandatory !== undefined) training.mandatory = mandatory === 'true' || mandatory === true;
        if (deadline) training.deadline = new Date(deadline);
        if (targetAudience) training.targetAudience = targetAudience;
        if (departments) training.departments = departments.split(',').map(d => d.trim());
        if (roles) training.roles = roles.split(',').map(r => r.trim());
        if (status) training.status = status;

        // Update content if provided
        if (type === 'video' && req.file) {
            // Delete old video file if exists
            if (training.content.uploadedVideo && training.content.uploadedVideo.path) {
                try {
                    fs.unlinkSync(training.content.uploadedVideo.path);
                } catch (err) {
                    console.log('Could not delete old video file:', err.message);
                }
            }
            
            training.content.uploadedVideo = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                size: req.file.size,
                mimetype: req.file.mimetype
            };
            training.content.youtube = undefined;
        } else if (type === 'youtube' && youtubeUrl) {
            const videoId = extractYouTubeVideoId(youtubeUrl);
            if (!videoId) {
                return res.status(400).json({ message: 'Invalid YouTube URL' });
            }
            training.content.youtube = {
                url: youtubeUrl,
                videoId: videoId
            };
            training.content.uploadedVideo = undefined;
        }

        // Update quiz if provided
        if (quiz) {
            try {
                training.quiz = typeof quiz === 'string' ? JSON.parse(quiz) : quiz;
            } catch (error) {
                return res.status(400).json({ message: 'Invalid quiz format' });
            }
        }

        training.updatedBy = req.user.userId;
        await training.save();

        res.json({
            message: 'Training updated successfully',
            training
        });
    } catch (error) {
        console.error('Error updating training:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete training course (Admin only)
router.delete('/:id', authenticateToken, requireCompliance, async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        // Delete associated video file if exists
        if (training.content.uploadedVideo && training.content.uploadedVideo.path) {
            try {
                fs.unlinkSync(training.content.uploadedVideo.path);
            } catch (err) {
                console.log('Could not delete video file:', err.message);
            }
        }

        // Delete training progress records
        await TrainingProgress.deleteMany({ trainingId: training._id });

        // Delete certificates
        await Certificate.deleteMany({ trainingId: training._id });

        // Delete training
        await Training.findByIdAndDelete(req.params.id);

        res.json({ message: 'Training deleted successfully' });
    } catch (error) {
        console.error('Error deleting training:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get training completion statistics (Admin only)
router.get('/admin/stats/:id', authenticateToken, requireCompliance, async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        const stats = await TrainingProgress.aggregate([
            { $match: { trainingId: training._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgScore: { $avg: '$bestScore' }
                }
            }
        ]);

        const totalUsers = await TrainingProgress.countDocuments({ trainingId: training._id });
        const completedUsers = await TrainingProgress.countDocuments({ 
            trainingId: training._id, 
            status: 'completed' 
        });

        res.json({
            training: {
                id: training._id,
                title: training.title
            },
            stats,
            totalUsers,
            completedUsers,
            completionRate: totalUsers > 0 ? (completedUsers / totalUsers * 100).toFixed(2) : 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============= EMPLOYEE ENDPOINTS =============

// Get available trainings for employee
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        // Build query based on user's department and role
        const query = {
            status: 'active',
            $or: [
                { targetAudience: 'all' },
                { departments: { $in: [user.department] } },
                { roles: { $in: [user.role] } }
            ]
        };

        const trainings = await Training.find(query)
            .select('-content.uploadedVideo.path') // Don't expose file paths
            .sort({ mandatory: -1, createdAt: -1 });

        // Get user's progress for these trainings
        const trainingIds = trainings.map(t => t._id);
        const userProgress = await TrainingProgress.find({
            userId: user.id,
            trainingId: { $in: trainingIds }
        });

        // Combine training data with progress
        const trainingsWithProgress = trainings.map(training => {
            const progress = userProgress.find(p => p.trainingId.toString() === training._id.toString());
            return {
                ...training.toObject(),
                userProgress: progress || null
            };
        });

        res.json(trainingsWithProgress);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get specific training details for employee
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ message: 'Training not found' });
        }

        // Check if user has access to this training
        const user = req.user;
        const hasAccess = training.targetAudience === 'all' ||
                         training.departments.includes(user.department) ||
                         training.roles.includes(user.role);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied to this training' });
        }

        // Get user's progress
        const progress = await TrainingProgress.findOne({
            userId: user.id,
            trainingId: training._id
        });

        // Don't expose file paths in response
        const trainingData = training.toObject();
        if (trainingData.content.uploadedVideo) {
            delete trainingData.content.uploadedVideo.path;
        }

        res.json({
            ...trainingData,
            userProgress: progress
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's training progress
router.get('/progress/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userProgress = await TrainingProgress.find({ userId })
            .populate('trainingId', 'title description category duration mandatory deadline');

        res.json({
            success: true,
            progress: userProgress
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Start training
router.post('/:id/start', authenticateToken, async (req, res) => {
    try {
        const trainingId = req.params.id;
        const userId = req.user.id;

        const training = await Training.findById(trainingId);
        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        // Check if already started
        const existingProgress = await TrainingProgress.findOne({ userId, trainingId });
        if (existingProgress && existingProgress.status !== 'not_started') {
            return res.status(400).json({
                success: false,
                message: 'Training already started or completed'
            });
        }

        // Update or create progress
        if (existingProgress) {
            existingProgress.status = 'in_progress';
            existingProgress.startedAt = new Date();
            existingProgress.progress = 0;
            await existingProgress.save();
        } else {
            const newProgress = new TrainingProgress({
                userId,
                trainingId,
                status: 'in_progress',
                progress: 0,
                startedAt: new Date()
            });
            await newProgress.save();
        }

        res.json({
            success: true,
            message: 'Training started successfully'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update training progress
router.put('/:id/progress', authenticateToken, async (req, res) => {
    try {
        const trainingId = req.params.id;
        const userId = req.user.id;
        const { progress } = req.body;

        const trainingProgress = await TrainingProgress.findOne({ userId, trainingId });
        if (!trainingProgress) {
            return res.status(404).json({
                success: false,
                message: 'Training progress not found'
            });
        }

        trainingProgress.progress = Math.min(100, Math.max(0, progress));
        trainingProgress.lastAccessedAt = new Date();

        if (trainingProgress.progress === 100) {
            trainingProgress.status = 'completed';
            trainingProgress.completedAt = new Date();
        }

        await trainingProgress.save();

        res.json({
            success: true,
            message: 'Progress updated successfully',
            progress: trainingProgress
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Submit quiz
router.post('/:id/quiz/submit', authenticateToken, async (req, res) => {
    try {
        const trainingId = req.params.id;
        const userId = req.user.id;
        const { answers } = req.body;

        const training = await Training.findById(trainingId);
        if (!training || !training.quiz) {
            return res.status(404).json({
                success: false,
                message: 'Training or quiz not found'
            });
        }

        // Calculate score
        let correctAnswers = 0;
        training.quiz.questions.forEach((question, index) => {
            if (answers[index] === question.correctAnswer) {
                correctAnswers++;
            }
        });

        const score = Math.round((correctAnswers / training.quiz.questions.length) * 100);
        const passed = score >= training.quiz.passingScore;

        // Update progress
        const trainingProgress = await TrainingProgress.findOne({ userId, trainingId });
        if (trainingProgress) {
            trainingProgress.currentScore = score;
            trainingProgress.bestScore = Math.max(trainingProgress.bestScore || 0, score);
            trainingProgress.quizAttempts = (trainingProgress.quizAttempts || 0) + 1;
            trainingProgress.lastQuizAt = new Date();
            
            if (passed) {
                trainingProgress.status = 'completed';
                trainingProgress.completedAt = new Date();
                trainingProgress.progress = 100;
            }
            
            await trainingProgress.save();
        }

        res.json({
            success: true,
            score,
            passed,
            passingScore: training.quiz.passingScore,
            message: passed ? 'Quiz passed successfully!' : 'Quiz failed. Please review the material and try again.'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Handle OPTIONS preflight requests for video endpoint
router.options('/video/:filename', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
});

// Serve video files for streaming
router.get('/video/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const videoPath = path.join(trainingDir, filename);

        // Check if file exists
        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Set comprehensive CORS headers for video streaming
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:3001');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, Accept, Accept-Encoding, Accept-Language, Cache-Control, Connection, Host, Pragma, Referer, User-Agent');
        res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range, Content-Type, Date, ETag, Last-Modified, Server');
        
        // Disable any potential blocking headers
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Cross-Origin-Resource-Policy');
        
        // Set video headers
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        
        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Handle range requests for video seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunksize);
            
            const videoStream = fs.createReadStream(videoPath, { start, end });
            videoStream.pipe(res);
        } else {
            // Serve entire file
            res.setHeader('Content-Length', fileSize);
            const videoStream = fs.createReadStream(videoPath);
            videoStream.pipe(res);
        }
    } catch (error) {
        console.error('Error serving video:', error);
        res.status(500).json({ message: 'Error serving video' });
    }
});

// Update video watch progress
router.put('/:id/video-progress', authenticateToken, async (req, res) => {
    try {
        const trainingId = req.params.id;
        const userId = req.user.id;
        const { watchTime, totalDuration, completed } = req.body;

        let trainingProgress = await TrainingProgress.findOne({ userId, trainingId });
        
        if (!trainingProgress) {
            // Create new progress if doesn't exist
            trainingProgress = new TrainingProgress({
                userId,
                trainingId,
                status: 'in_progress',
                progress: 0,
                startedAt: new Date()
            });
        }

        // Update video progress
        trainingProgress.videoWatchTime = watchTime;
        trainingProgress.videoCompleted = completed || false;
        trainingProgress.lastAccessedAt = new Date();

        // Calculate overall progress based on video completion
        if (completed) {
            trainingProgress.progress = 100;
            // If no quiz required, mark as completed
            const training = await Training.findById(trainingId);
            if (!training.quiz || !training.quiz.questions || training.quiz.questions.length === 0) {
                trainingProgress.status = 'completed';
                trainingProgress.completedAt = new Date();
            }
        } else if (totalDuration > 0) {
            trainingProgress.progress = Math.min(95, (watchTime / totalDuration) * 100);
        }

        await trainingProgress.save();

        res.json({
            success: true,
            message: 'Video progress updated',
            progress: trainingProgress
        });
    } catch (error) {
        console.error('Error updating video progress:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Generate certificate for completed training
router.post('/:id/certificate', authenticateToken, async (req, res) => {
    try {
        const trainingId = req.params.id;
        const userId = req.user.id;

        // Check if training is completed
        const progress = await TrainingProgress.findOne({ 
            userId, 
            trainingId, 
            status: 'completed' 
        });

        if (!progress) {
            return res.status(400).json({ 
                message: 'Training must be completed before generating certificate' 
            });
        }

        // Check if certificate already exists
        let certificate = await Certificate.findOne({ userId, trainingId });
        
        if (!certificate) {
            const training = await Training.findById(trainingId);
            const user = req.user;

            // Generate certificate
            certificate = new Certificate({
                userId,
                trainingId,
                certificateId: Certificate.generateCertificateId(),
                userName: user.username,
                trainingTitle: training.title,
                completionDate: progress.completedAt,
                score: progress.bestScore || 0,
                passingScore: training.quiz?.passingScore || 0,
                duration: training.duration,
                category: training.category,
                issuedBy: 'LMS Orient Training System'
            });

            await certificate.save();

            // Update progress to mark certificate as generated
            progress.certificateGenerated = true;
            progress.certificateUrl = `/api/training/certificate/${certificate._id}`;
            await progress.save();
        }

        res.json({
            success: true,
            message: 'Certificate generated successfully',
            certificate: {
                id: certificate._id,
                certificateId: certificate.certificateId,
                url: `/api/training/certificate/${certificate._id}`
            }
        });
    } catch (error) {
        console.error('Error generating certificate:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Download certificate
router.get('/certificate/:certificateId', async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.certificateId)
            .populate('userId', 'username email')
            .populate('trainingId', 'title description');

        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // Record download
        await Certificate.recordDownload(certificate._id);

        // Generate simple certificate HTML (in a real app, you'd use a proper template engine)
        const certificateHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Training Certificate</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
                .certificate { border: 3px solid #0066cc; padding: 40px; margin: 20px auto; max-width: 800px; }
                .header { font-size: 24px; color: #0066cc; margin-bottom: 20px; }
                .title { font-size: 32px; font-weight: bold; margin: 20px 0; }
                .recipient { font-size: 20px; margin: 20px 0; }
                .course { font-size: 18px; font-style: italic; margin: 20px 0; }
                .details { margin: 30px 0; }
                .signature { margin-top: 40px; }
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="header">LMS ORIENT TRAINING SYSTEM</div>
                <div class="title">CERTIFICATE OF COMPLETION</div>
                <div class="recipient">This is to certify that</div>
                <div class="recipient" style="font-size: 24px; font-weight: bold;">${certificate.userName}</div>
                <div class="recipient">has successfully completed the training course</div>
                <div class="course">"${certificate.trainingTitle}"</div>
                <div class="details">
                    <p>Completion Date: ${certificate.completionDate.toLocaleDateString()}</p>
                    <p>Score: ${certificate.score}% (Passing: ${certificate.passingScore}%)</p>
                    <p>Duration: ${certificate.duration} minutes</p>
                    <p>Category: ${certificate.category}</p>
                    <p>Certificate ID: ${certificate.certificateId}</p>
                </div>
                <div class="signature">
                    <p>Issued by: ${certificate.issuedBy}</p>
                    <p>Date Issued: ${certificate.createdAt.toLocaleDateString()}</p>
                </div>
            </div>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(certificateHtml);
    } catch (error) {
        console.error('Error serving certificate:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;