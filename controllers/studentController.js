const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const wantsJson = require('../utils/wantsJson');

// List students with filters
const getStudents = asyncHandler(async (req, res) => {
  const { department, course, search, status } = req.query;
  const query = {};
  if (department) query.department = department;
  if (course) query.course = course;
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  const [students, departments, courses] = await Promise.all([
    Student.find(query).populate('department', 'name code').populate('course', 'name code').sort({ createdAt: -1 }),
    Department.find({}).sort({ name: 1 }),
    Course.find({}).sort({ name: 1 }),
  ]);

  if (wantsJson(req)) return res.json(students);
  res.render('students/index', { title: 'Students', students, departments, courses, filters: { department: department||'', course: course||'', search: search||'', status: status||'' } });
});

// Single student
const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('department', 'name code')
    .populate('course', 'name code');
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student not found' });
    req.flash('error', 'Student not found');
    return res.redirect('/students');
  }
  const courseOptions = new Map();
  if (student.course) {
    courseOptions.set(String(student.course._id), {
      _id: student.course._id,
      name: student.course.name,
      code: student.course.code,
    });
  }

  if (student.user) {
    const enrollments = await Enrollment.find({ user: student.user, status: 'enrolled' })
      .populate('course', 'name code')
      .sort({ createdAt: -1 });

    enrollments.forEach((entry) => {
      if (!entry.course) return;
      courseOptions.set(String(entry.course._id), {
        _id: entry.course._id,
        name: entry.course.name,
        code: entry.course.code,
      });
    });
  }

  const certificates = await Certificate.find({ student: student._id })
    .populate('course', 'name code')
    .populate('issuedBy', 'name email')
    .sort({ issueDate: -1 });

  if (wantsJson(req)) {
    return res.json({
      ...student.toObject(),
      availableCourses: Array.from(courseOptions.values()),
      certificates,
    });
  }

  res.render('students/show', {
    title: student.name,
    student,
    availableCourses: Array.from(courseOptions.values()),
    certificates,
  });
});

// New form
const showNewStudentForm = asyncHandler(async (req, res) => {
  const [departments, courses] = await Promise.all([
    Department.find({ isActive: true }).sort({ name: 1 }),
    Course.find({ isActive: true }).sort({ name: 1 }),
  ]);
  res.render('students/new', { title: 'Add Student', departments, courses });
});

// Create
const createStudent = asyncHandler(async (req, res) => {
  const { name, email, rollNumber, department, course, year, semester, enrollmentDate, status, notes, createLogin, password } = req.body;
  const exists = await Student.findOne({ $or: [{ email }, { rollNumber: rollNumber.toUpperCase() }] });
  if (exists) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Email or Roll Number already exists' });
    req.flash('error', 'Email or Roll Number already exists');
    return res.redirect('/students/new');
  }
  const student = new Student({
    name,
    email: email.toLowerCase(),
    rollNumber: rollNumber.toUpperCase(),
    department,
    course,
    year: parseInt(year) || 1,
    semester: parseInt(semester) || 1,
    enrollmentDate: enrollmentDate || Date.now(),
    status: status || 'active',
    notes,
  });

  // Optionally create a login account for this student
  if (createLogin === 'on') {
    // Ensure no conflicting user
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      if (wantsJson(req)) return res.status(400).json({ message: 'A user with this email already exists' });
      req.flash('error', 'A user with this email already exists');
      return res.redirect('/students/new');
    }
    if (!password || password.length < 6) {
      if (wantsJson(req)) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect('/students/new');
    }
    const user = new User({ name, email: email.toLowerCase(), password, role: 'student', isActive: true });
    await user.save();
    student.user = user._id;
  }
  const created = await student.save();
  if (wantsJson(req)) return res.status(201).json(created);
  req.flash('success', 'Student created');
  res.redirect(`/students/${created._id}`);
});

// Edit form
const showEditStudentForm = asyncHandler(async (req, res) => {
  const [student, departments, courses] = await Promise.all([
    Student.findById(req.params.id),
    Department.find({ isActive: true }).sort({ name: 1 }),
    Course.find({ isActive: true }).sort({ name: 1 }),
  ]);
  if (!student) {
    req.flash('error', 'Student not found');
    return res.redirect('/students');
  }
  res.render('students/edit', { title: 'Edit Student', student, departments, courses });
});

// Update
const updateStudent = asyncHandler(async (req, res) => {
  const { name, email, rollNumber, department, course, year, semester, enrollmentDate, status, notes, createLogin, password, resetPassword } = req.body;
  const student = await Student.findById(req.params.id);
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student not found' });
    req.flash('error', 'Student not found');
    return res.redirect('/students');
  }
  // unique checks excluding current id
  const exists = await Student.findOne({
    _id: { $ne: student._id },
    $or: [{ email: email.toLowerCase() }, { rollNumber: rollNumber.toUpperCase() }],
  });
  if (exists) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Email or Roll Number already exists' });
    req.flash('error', 'Email or Roll Number already exists');
    return res.redirect(`/students/${student._id}/edit`);
  }

  student.name = name;
  student.email = email.toLowerCase();
  student.rollNumber = rollNumber.toUpperCase();
  student.department = department;
  student.course = course;
  student.year = parseInt(year) || student.year;
  student.semester = parseInt(semester) || student.semester;
  student.enrollmentDate = enrollmentDate || student.enrollmentDate;
  student.status = status || student.status;
  student.notes = notes;

  const updated = await student.save();

  // Handle login linking / password reset after base student save
  // Create login if requested and not already linked
  if (createLogin === 'on' && !student.user) {
    const conflict = await User.findOne({ email: email.toLowerCase() });
    if (conflict) {
      if (wantsJson(req)) return res.status(400).json({ message: 'A user with this email already exists' });
      req.flash('error', 'A user with this email already exists');
      return res.redirect(`/students/${student._id}/edit`);
    }
    if (!password || password.length < 6) {
      if (wantsJson(req)) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect(`/students/${student._id}/edit`);
    }
    const user = new User({ name, email: email.toLowerCase(), password, role: 'student', isActive: true });
    await user.save();
    student.user = user._id;
    await student.save();
  }

  // Reset password if requested
  if (resetPassword && student.user) {
    if (resetPassword.length < 6) {
      if (wantsJson(req)) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect(`/students/${student._id}/edit`);
    }
    const user = await User.findById(student.user);
    if (user) {
      user.password = resetPassword; // pre-save hook will hash
      await user.save();
    }
  }

  if (wantsJson(req)) return res.json(updated);
  req.flash('success', 'Student updated');
  res.redirect(`/students/${updated._id}`);
});

// Delete
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student not found' });
    req.flash('error', 'Student not found');
    return res.redirect('/students');
  }
  await student.deleteOne();
  if (wantsJson(req)) return res.json({ message: 'Student removed' });
  req.flash('success', 'Student deleted');
  res.redirect('/students');
});

const resetStudentPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const student = await Student.findById(req.params.id);

  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student not found' });
    req.flash('error', 'Student not found');
    return res.redirect('/students');
  }

  if (!password || password.length < 6) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    req.flash('error', 'Password must be at least 6 characters');
    return res.redirect(`/students/${student._id}`);
  }

  let user = student.user ? await User.findById(student.user) : null;

  if (!user) {
    const conflict = await User.findOne({ email: student.email.toLowerCase() });
    if (conflict) {
      if (wantsJson(req)) return res.status(400).json({ message: 'Another user already uses this email' });
      req.flash('error', 'Another user already uses this email. Update student email first.');
      return res.redirect(`/students/${student._id}`);
    }

    user = new User({
      name: student.name,
      email: student.email.toLowerCase(),
      password,
      role: 'student',
      isActive: true,
    });
    await user.save();
    student.user = user._id;
    await student.save();
  } else {
    user.password = password;
    user.name = student.name;
    user.email = student.email.toLowerCase();
    user.role = 'student';
    user.isActive = true;
    await user.save();
  }

  if (wantsJson(req)) {
    return res.json({ message: 'Student login password updated successfully' });
  }

  req.flash('success', 'Student login password updated successfully');
  res.redirect(`/students/${student._id}`);
});

module.exports = {
  getStudents,
  getStudent,
  showNewStudentForm,
  createStudent,
  showEditStudentForm,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
};
