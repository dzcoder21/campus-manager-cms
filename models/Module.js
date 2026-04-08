const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Module name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Module code is required'],
        trim: true,
        uppercase: true,
        unique: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required']
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Department is required']
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
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: [1, 'Semester must be at least 1'],
        max: [12, 'Semester cannot exceed 12']
    },
    isCore: {
        type: Boolean,
        default: true
    },
    lecturer: {
        type: String,
        trim: true
    },
    learningOutcomes: [{
        type: String,
        trim: true
    }],
    assessmentMethods: {
        exam: { type: Number, min: 0, max: 100, default: 60 },
        coursework: { type: Number, min: 0, max: 100, default: 40 },
        practical: { type: Number, min: 0, max: 100, default: 0 }
    },
    prerequisites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module'
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for module's URL
moduleSchema.virtual('url').get(function() {
    return `/modules/${this._id}`;
});

// Index for frequently queried fields
moduleSchema.index({ name: 'text', code: 'text', description: 'text' });

// Pre-save hook to validate course and department existence
moduleSchema.pre('save', async function(next) {
    try {
        const [course, department] = await Promise.all([
            mongoose.model('Course').findById(this.course),
            mongoose.model('Department').findById(this.department)
        ]);

        if (!course) {
            throw new Error('Course not found');
        }
        if (!department) {
            throw new Error('Department not found');
        }

        // Ensure the department matches the course's department
        if (course.department.toString() !== this.department.toString()) {
            throw new Error('Department does not match the course department');
        }

        next();
    } catch (err) {
        next(err);
    }
});

// Pre-remove hook to handle module deletion
moduleSchema.pre('remove', async function(next) {
    try {
        // Remove this module from any prerequisites
        await this.model('Module').updateMany(
            { prerequisites: this._id },
            { $pull: { prerequisites: this._id } }
        );
        next();
    } catch (err) {
        next(err);
    }
});

const Module = mongoose.model('Module', moduleSchema);

module.exports = Module;
