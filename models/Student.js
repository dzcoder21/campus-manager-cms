const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    year: { type: Number, min: 1, max: 10, default: 1 },
    semester: { type: Number, min: 1, max: 12, default: 1 },
    enrollmentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'graduated', 'on_leave', 'inactive'], default: 'active' },
    notes: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    certificateVideosWatched: { type: Boolean, default: false },
  },
  { timestamps: true }
);

studentSchema.index({ name: 'text', email: 'text', rollNumber: 'text' });

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
