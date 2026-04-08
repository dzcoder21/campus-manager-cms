const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Course code is required'],
        trim: true,
        uppercase: true,
        unique: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Department is required']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 year'],
        max: [10, 'Duration cannot exceed 10 years']
    },
    description: {
        type: String,
        trim: true
    },
    credits: {
        type: Number,
        required: [true, 'Credits are required'],
        min: [1, 'Minimum 1 credit required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    fee: {
        type: Number,
        required: [true, 'Course fee is required'],
        min: [0, 'Fee cannot be negative']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        validate: {
            validator: function(value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for course's URL
courseSchema.virtual('url').get(function() {
    return `/courses/${this._id}`;
});

// Virtual for list of modules in course
courseSchema.virtual('modules', {
    ref: 'Module',
    localField: '_id',
    foreignField: 'course'
});

// Index for frequently queried fields
courseSchema.index({ name: 'text', code: 'text', description: 'text' });

// Pre-save hook to validate department existence
courseSchema.pre('save', async function(next) {
    try {
        const Department = mongoose.model('Department');
        const department = await Department.findById(this.department);
        if (!department) {
            throw new Error('Department not found');
        }
        next();
    } catch (err) {
        next(err);
    }
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
