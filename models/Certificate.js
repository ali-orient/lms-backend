const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    trainingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Training',
        required: true
    },
    certificateId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    userName: {
        type: String,
        required: true,
        trim: true
    },
    trainingTitle: {
        type: String,
        required: true,
        trim: true
    },
    completionDate: {
        type: Date,
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: [0, 'Score cannot be negative'],
        max: [100, 'Score cannot exceed 100']
    },
    passingScore: {
        type: Number,
        required: true,
        min: [0, 'Passing score cannot be negative'],
        max: [100, 'Passing score cannot exceed 100']
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    certificateUrl: {
        type: String,
        trim: true
    },
    certificateFilename: {
        type: String,
        trim: true
    },
    issuedBy: {
        type: String,
        default: 'Orient LMS Training System',
        trim: true
    },
    validUntil: {
        type: Date
    },
    isValid: {
        type: Boolean,
        default: true
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    lastDownloadedAt: {
        type: Date
    },
    metadata: {
        trainingType: {
            type: String,
            enum: ['video', 'youtube', 'interactive']
        },
        quizAttempts: {
            type: Number,
            default: 1
        },
        timeSpent: {
            type: Number // in minutes
        },
        generatedBy: {
            type: String,
            default: 'system'
        }
    }
}, {
    timestamps: true
});

// Index for better query performance
certificateSchema.index({ userId: 1 });
certificateSchema.index({ trainingId: 1 });
certificateSchema.index({ certificateId: 1 }, { unique: true });
certificateSchema.index({ completionDate: 1 });
certificateSchema.index({ isValid: 1 });

// Compound index for unique user-training certificate
certificateSchema.index({ userId: 1, trainingId: 1 }, { unique: true });

// Virtual for certificate age in days
certificateSchema.virtual('certificateAge').get(function() {
    const now = new Date();
    const issued = this.createdAt;
    const diffTime = Math.abs(now - issued);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for validity status
certificateSchema.virtual('isCurrentlyValid').get(function() {
    if (!this.isValid) return false;
    if (!this.validUntil) return true;
    return new Date() <= this.validUntil;
});

// Method to generate unique certificate ID
certificateSchema.statics.generateCertificateId = function() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `CERT-${timestamp}-${randomStr}`.toUpperCase();
};

// Method to increment download count
certificateSchema.methods.recordDownload = function() {
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
    return this.save();
};

// Method to invalidate certificate
certificateSchema.methods.invalidate = function(reason) {
    this.isValid = false;
    this.metadata.invalidationReason = reason;
    this.metadata.invalidatedAt = new Date();
    return this.save();
};

// Static method to find user certificates
certificateSchema.statics.findUserCertificates = function(userId) {
    return this.find({ userId, isValid: true })
        .populate('trainingId', 'title category')
        .sort({ completionDate: -1 });
};

// Static method to find certificates by training
certificateSchema.statics.findTrainingCertificates = function(trainingId) {
    return this.find({ trainingId, isValid: true })
        .populate('userId', 'name email department')
        .sort({ completionDate: -1 });
};

// Static method to get certificate statistics
certificateSchema.statics.getCertificateStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: '$completionDate' },
                    month: { $month: '$completionDate' }
                },
                totalCertificates: { $sum: 1 },
                avgScore: { $avg: '$score' },
                categories: { $addToSet: '$category' }
            }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);
};

module.exports = mongoose.model('Certificate', certificateSchema);