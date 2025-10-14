const mongoose = require('mongoose');

const trainingProgressSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: {
            values: ['not_started', 'in_progress', 'completed', 'failed'],
            message: 'Invalid status'
        },
        default: 'not_started'
    },
    progress: {
        type: Number,
        min: [0, 'Progress cannot be negative'],
        max: [100, 'Progress cannot exceed 100'],
        default: 0
    },
    videoWatchTime: {
        type: Number, // in seconds
        default: 0
    },
    videoCompleted: {
        type: Boolean,
        default: false
    },
    quizAttempts: [{
        attemptNumber: {
            type: Number,
            required: true
        },
        answers: [{
            questionIndex: {
                type: Number,
                required: true
            },
            selectedAnswer: {
                type: Number,
                required: true
            },
            isCorrect: {
                type: Boolean,
                required: true
            }
        }],
        score: {
            type: Number,
            min: [0, 'Score cannot be negative'],
            max: [100, 'Score cannot exceed 100']
        },
        passed: {
            type: Boolean,
            default: false
        },
        timeSpent: {
            type: Number, // in minutes
            default: 0
        },
        submittedAt: {
            type: Date,
            default: Date.now
        }
    }],
    bestScore: {
        type: Number,
        min: [0, 'Score cannot be negative'],
        max: [100, 'Score cannot exceed 100'],
        default: 0
    },
    quizPassed: {
        type: Boolean,
        default: false
    },
    certificateGenerated: {
        type: Boolean,
        default: false
    },
    certificateUrl: {
        type: String,
        trim: true
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Compound index for unique user-training combination
trainingProgressSchema.index({ userId: 1, trainingId: 1 }, { unique: true });

// Index for better query performance
trainingProgressSchema.index({ status: 1 });
trainingProgressSchema.index({ completedAt: 1 });
trainingProgressSchema.index({ userId: 1, status: 1 });

// Virtual for total quiz attempts
trainingProgressSchema.virtual('totalQuizAttempts').get(function() {
    return this.quizAttempts ? this.quizAttempts.length : 0;
});

// Virtual for completion percentage
trainingProgressSchema.virtual('completionPercentage').get(function() {
    return this.progress;
});

// Method to check if user can take quiz
trainingProgressSchema.methods.canTakeQuiz = function(training) {
    if (!training || !training.quiz) return false;
    
    // Check if video is completed (if required)
    if (training.hasVideoContent() && !this.videoCompleted) {
        return false;
    }
    
    // Check if already passed
    if (this.quizPassed) {
        return training.quiz.allowRetakes;
    }
    
    // Check attempt limit
    const attemptCount = this.quizAttempts ? this.quizAttempts.length : 0;
    return attemptCount < (training.quiz.maxAttempts || 3);
};

// Method to add quiz attempt
trainingProgressSchema.methods.addQuizAttempt = function(answers, score, passed, timeSpent) {
    if (!this.quizAttempts) {
        this.quizAttempts = [];
    }
    
    const attemptNumber = this.quizAttempts.length + 1;
    
    this.quizAttempts.push({
        attemptNumber,
        answers,
        score,
        passed,
        timeSpent,
        submittedAt: new Date()
    });
    
    // Update best score
    if (score > this.bestScore) {
        this.bestScore = score;
    }
    
    // Update quiz passed status
    if (passed) {
        this.quizPassed = true;
        this.status = 'completed';
        this.progress = 100;
        this.completedAt = new Date();
    }
    
    return this.save();
};

// Method to update video progress
trainingProgressSchema.methods.updateVideoProgress = function(watchTime, totalDuration) {
    this.videoWatchTime = Math.max(this.videoWatchTime, watchTime);
    
    // Consider video completed if watched 90% or more
    const watchPercentage = (watchTime / totalDuration) * 100;
    if (watchPercentage >= 90) {
        this.videoCompleted = true;
        this.progress = Math.max(this.progress, 50); // Video completion is 50% of total progress
    } else {
        this.progress = Math.max(this.progress, Math.floor(watchPercentage * 0.5));
    }
    
    this.lastAccessedAt = new Date();
    
    if (this.status === 'not_started') {
        this.status = 'in_progress';
        this.startedAt = new Date();
    }
    
    return this.save();
};

// Static method to get user progress for all trainings
trainingProgressSchema.statics.getUserProgress = function(userId) {
    return this.find({ userId })
        .populate('trainingId', 'title description category duration mandatory deadline status')
        .sort({ updatedAt: -1 });
};

// Static method to get training completion statistics
trainingProgressSchema.statics.getTrainingStats = function(trainingId) {
    return this.aggregate([
        { $match: { trainingId: mongoose.Types.ObjectId(trainingId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgScore: { $avg: '$bestScore' }
            }
        }
    ]);
};

module.exports = mongoose.model('TrainingProgress', trainingProgressSchema);