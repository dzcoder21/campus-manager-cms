const asyncHandler = require('express-async-handler');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const wantsJson = require('../utils/wantsJson');

const ensurePrimaryCourseEnrollment = async (sessionUser) => {
  const userId = sessionUser && sessionUser._id;
  const userEmail = sessionUser && sessionUser.email ? String(sessionUser.email).toLowerCase() : '';
  if (!userId) return;

  let student = await Student.findOne({ user: userId }).select('course user email');
  if (!student && userEmail) {
    student = await Student.findOne({ email: userEmail }).select('course user email');
    if (student && !student.user) {
      student.user = userId;
      await student.save();
    }
  }

  if (!student || !student.course) return;

  const existing = await Enrollment.findOne({ user: userId, course: student.course });
  if (existing) return;

  try {
    await Enrollment.create({ user: userId, course: student.course, status: 'enrolled' });
  } catch (err) {
    if (!(err && err.code === 11000)) {
      throw err;
    }
  }
};

// GET /portal/my-courses
const getMyCourses = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  await ensurePrimaryCourseEnrollment(req.session.user);

  const student = await Student.findOne({ user: userId }).select('certificateVideosWatched').lean();
  const certificates = await Certificate.find({ student: student ? student._id : null }).select('course').lean();
  const issuedCourseIds = new Set(certificates.map((cert) => String(cert.course)));

  const enrollments = await Enrollment.find({ user: userId, status: 'enrolled' })
    .populate({ path: 'course', populate: { path: 'department', select: 'name code' } })
    .sort({ createdAt: -1 });

  if (wantsJson(req)) return res.json(enrollments);
  res.render('portal/my-courses', { title: 'My Courses', enrollments, student, issuedCourseIds });
});

// POST /portal/enroll { courseId }
const enrollInCourse = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Course not found' });
    req.flash('error', 'Course not found');
    return res.redirect('/catalog');
  }
  const existing = await Enrollment.findOne({ user: userId, course: courseId });
  if (existing) {
    if (existing.status === 'enrolled') {
      if (wantsJson(req)) return res.json({ message: 'Already enrolled' });
      req.flash('success', 'Already enrolled');
      return res.redirect(`/catalog/course/${courseId}`);
    }

    existing.status = 'enrolled';
    await existing.save();
  } else {
    await Enrollment.create({ user: userId, course: courseId, status: 'enrolled' });
  }

  if (wantsJson(req)) return res.status(201).json({ message: 'Enrolled' });
  req.flash('success', 'Enrolled successfully');
  res.redirect(`/catalog/course/${courseId}`);
});

// POST /portal/drop { courseId }
const dropFromCourse = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  const { courseId } = req.body;
  const enrollment = await Enrollment.findOne({ user: userId, course: courseId, status: 'enrolled' });
  if (!enrollment) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Enrollment not found' });
    req.flash('error', 'You are not enrolled in this course');
    return res.redirect(`/catalog/course/${courseId}`);
  }

  enrollment.status = 'dropped';
  await enrollment.save();

  if (wantsJson(req)) return res.json({ message: 'Dropped' });
  req.flash('success', 'Dropped from course');
  res.redirect(`/catalog/course/${courseId}`);
});

module.exports = { getMyCourses, enrollInCourse, dropFromCourse };
