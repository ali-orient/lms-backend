const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Training title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Training description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: ['Mandatory', 'Security', 'Compliance', 'Technical', 'Soft Skills', 'Other'],
            message: 'Invalid category'
        }
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 minute']
    },
    type: {
        type: String,
        required: [true, 'Training type is required'],
        enum: {
            values: ['video', 'youtube', 'interactive'],
            message: 'Type must be video, youtube, or interactive'
        }
    },
    status: {
        type: String,
        enum: {
            values: ['draft', 'active', 'inactive', 'archived'],
            message: 'Invalid status'
        },
        default: 'draft'
    },
    mandatory: {
        type: Boolean,
        default: false
    },
    deadline: {
        type: Date
    },
    content: {
        // For uploaded video files
        videoUrl: {
            type: String,
            trim: true
        },
        videoFilename: {
            type: String,
            trim: true
        },
        videoSize: {
            type: Number
        },
        // For YouTube videos
        youtubeUrl: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    if (!v) return true; // Allow empty
                    return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(v);
                },
                message: 'Please provide a valid YouTube URL'
            }
        },
        youtubeVideoId: {
            type: String,
            trim: true
        },
        // Additional materials
        materials: [{
            name: {
                type: String,
                required: true,
                trim: true
            },
            url: {
                type: String,
                required: true,
                trim: true
            },
            type: {
                type: String,
                enum: ['pdf', 'doc', 'link', 'other'],
                default: 'other'
            }
        }]
    },
    quiz: {
        questions: [{
            question: {
                type: String,
                required: true,
                trim: true,
                maxlength: [500, 'Question cannot exceed 500 characters']
            },
            options: [{
                type: String,
                required: true,
                trim: true,
                maxlength: [200, 'Option cannot exceed 200 characters']
            }],
            correctAnswer: {
                type: Number,
                required: true,
                min: 0
            },
            explanation: {
                type: String,
                trim: true,
                maxlength: [300, 'Explanation cannot exceed 300 characters']
            }
        }],
        passingScore: {
            type: Number,
            required: function() {
                return this.quiz && this.quiz.questions && this.quiz.questions.length > 0;
            },
            min: [0, 'Passing score cannot be negative'],
            max: [100, 'Passing score cannot exceed 100'],
            default: 70
        },
        timeLimit: {
            type: Number, // in minutes
            min: [1, 'Time limit must be at least 1 minute'],
            default: 30
        },
        allowRetakes: {
            type: Boolean,
            default: true
        },
        maxAttempts: {
            type: Number,
            min: [1, 'Must allow at least 1 attempt'],
            default: 3
        }
    },
    targetAudience: {
        type: String,
        enum: {
            values: ['all', 'employees', 'managers', 'compliance', 'specific'],
            message: 'Invalid target audience'
        },
        default: 'all'
    },
    specificDepartments: [{
        type: String,
        trim: true
    }],
    specificRoles: [{
        type: String,
        enum: ['employee', 'compliance', 'admin'],
        message: 'Invalid role'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for better query performance
trainingSchema.index({ status: 1, category: 1 });
trainingSchema.index({ mandatory: 1, deadline: 1 });
trainingSchema.index({ createdBy: 1 });

// Virtual for quiz question count
trainingSchema.virtual('quizQuestionCount').get(function() {
    return this.quiz && this.quiz.questions ? this.quiz.questions.length : 0;
});

// Method to check if training has video content
trainingSchema.methods.hasVideoContent = function() {
    return !!(this.content.videoUrl || this.content.youtubeUrl);
};

// Method to get video source type
trainingSchema.methods.getVideoSourceType = function() {
    if (this.content.videoUrl) return 'uploaded';
    if (this.content.youtubeUrl) return 'youtube';
    return null;
};

// Static method to find active trainings
trainingSchema.statics.findActive = function() {
    return this.find({ status: 'active', isActive: true });
};

// Static method to find mandatory trainings
trainingSchema.statics.findMandatory = function() {
    return this.find({ mandatory: true, status: 'active', isActive: true });
};

module.exports = mongoose.model('Training', trainingSchema);