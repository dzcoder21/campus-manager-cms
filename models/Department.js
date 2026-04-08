const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Department name is required'],
        trim: true,
        unique: true
    },
    code: {
        type: String,
        required: [true, 'Department code is required'],
        trim: true,
        uppercase: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    headOfDepartment: {
        type: String,
        trim: true
    },
    establishedDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for department's URL
departmentSchema.virtual('url').get(function() {
    return `/departments/${this._id}`;
});

// Virtual for list of courses in department
departmentSchema.virtual('courses', {
    ref: 'Course',
    localField: '_id',
    foreignField: 'department'
});

// Pre-remove hook to handle department deletion
departmentSchema.pre('remove', async function(next) {
    try {
        // Remove all courses associated with this department
        await this.model('Course').deleteMany({ department: this._id });
        next();
    } catch (err) {
        next(err);
    }
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
