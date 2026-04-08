const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const wantsJson = require('../utils/wantsJson');

const resolveLogoPath = () => {
  const fullPath = path.join(__dirname, '..', 'public', 'images', 'university-logo.png');
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
};

const buildCertificateNumber = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CERT-${stamp}-${rand}`;
};

const getStudentForSessionUser = async (sessionUser) => {
  const userId = sessionUser && sessionUser._id;
  const userEmail = sessionUser && sessionUser.email ? String(sessionUser.email).toLowerCase() : '';
  if (!userId && !userEmail) return null;

  let student = null;
  if (userId) {
    student = await Student.findOne({ user: userId });
  }

  if (!student && userEmail) {
    student = await Student.findOne({ email: userEmail });
    if (student && !student.user && userId) {
      student.user = userId;
      await student.save();
    }
  }

  return student;
};

const showCertificateVideos = asyncHandler(async (req, res) => {
  const student = await getStudentForSessionUser(req.session.user);
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student profile not found' });
    req.flash('error', 'Student profile not found');
    return res.redirect('/portal/my-courses');
  }

  const enrolledCourse = student.user
    ? await Enrollment.findOne({ user: student.user, status: 'enrolled' }).populate('course', 'name code')
    : null;
  const courseId = enrolledCourse?.course?._id || student.course || null;
  const courseTitle = enrolledCourse?.course ? `${enrolledCourse.course.name} (${enrolledCourse.course.code})` : '';

  const videoFolder = path.join(__dirname, '..', 'public', 'certificate-videos');
  let videos = [];
  try {
    videos = fs
      .readdirSync(videoFolder)
      .filter((file) => ['.mp4', '.webm', '.ogg'].includes(path.extname(file).toLowerCase()))
      .map((file) => {
        const ext = path.extname(file).toLowerCase();
        return {
          name: file,
          url: `/certificate-videos/${encodeURIComponent(file)}`,
          type: `video/${ext.slice(1)}`,
        };
      });
  } catch (err) {
    videos = [];
  }

  if (wantsJson(req)) return res.json({ student, videos, courseId, courseTitle });
  res.render('portal/certificate-videos', {
    title: 'Certificate Videos',
    student,
    videos,
    courseId,
    courseTitle,
  });
});

const completeCertificateVideos = asyncHandler(async (req, res) => {
  const student = await getStudentForSessionUser(req.session.user);
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student profile not found' });
    req.flash('error', 'Student profile not found');
    return res.redirect('/portal/my-courses');
  }

  if (!student.certificateVideosWatched) {
    student.certificateVideosWatched = true;
    await student.save();
  }

  if (wantsJson(req)) return res.json({ message: 'Certificate videos marked as watched' });
  req.flash('success', 'Certificate videos marked completed. You can now claim your certificate.');
  res.redirect('/portal/my-courses');
});

const claimCertificate = asyncHandler(async (req, res) => {
  const student = await getStudentForSessionUser(req.session.user);
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student profile not found' });
    req.flash('error', 'Student profile not found');
    return res.redirect('/portal/my-courses');
  }

  const { courseId, watchedAll } = req.body;
  if (!student.certificateVideosWatched && watchedAll === 'true') {
    student.certificateVideosWatched = true;
    await student.save();
  }

  if (!student.certificateVideosWatched) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Please complete the certificate videos first' });
    req.flash('error', 'Please complete the certificate videos first');
    return res.redirect('/portal/certificate-videos');
  }

  const course = await Course.findById(courseId || student.course).select('name code');
  if (!course) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Valid course is required to claim certificate' });
    req.flash('error', 'Valid course is required to claim certificate');
    return res.redirect('/portal/my-courses');
  }

  const enrollment = await Enrollment.findOne({ user: student.user, course: course._id, status: 'enrolled' });
  if (!enrollment) {
    if (wantsJson(req)) return res.status(400).json({ message: 'You must be enrolled in the course to claim a certificate' });
    req.flash('error', 'You must be enrolled in the course to claim a certificate');
    return res.redirect('/portal/my-courses');
  }

  const exists = await Certificate.findOne({ student: student._id, course: course._id });
  if (exists) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Certificate already issued for this course' });
    req.flash('error', 'Certificate already issued for this course');
    return res.redirect('/portal/certificates');
  }

  const certificate = await Certificate.create({
    certificateNumber: buildCertificateNumber(),
    student: student._id,
    course: course._id,
    title: 'Course Completion Certificate',
    remarks: '',
    issueDate: new Date(),
    issuedBy: req.session.user._id,
  });

  if (!student.certificateVideosWatched) {
    student.certificateVideosWatched = true;
    await student.save();
  }

  if (wantsJson(req)) return res.status(201).json(certificate);
  res.redirect(`/portal/certificates/${certificate._id}/download`);
});

const streamCertificatePdf = (res, certificate) => {
  const studentName = certificate.student && certificate.student.name ? certificate.student.name : 'Student';
  const rollNumber = certificate.student && certificate.student.rollNumber ? certificate.student.rollNumber : '-';
  const courseName = certificate.course && certificate.course.name ? certificate.course.name : 'Course';
  const courseCode = certificate.course && certificate.course.code ? certificate.course.code : '-';
  const issueDate = new Date(certificate.issueDate).toLocaleDateString('en-GB');
  const issuedBy = certificate.issuedBy && certificate.issuedBy.name ? certificate.issuedBy.name : 'Admin';

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filename = `${certificate.certificateNumber}.pdf`;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const centerX = pageWidth / 2;
  const logoPath = resolveLogoPath();
  const logoSize = 34;
  const logoY = 71;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Outer and inner frame
  doc.rect(28, 28, pageWidth - 56, pageHeight - 56).lineWidth(2).stroke('#0f4c81');
  doc.rect(40, 40, pageWidth - 80, pageHeight - 80).lineWidth(1).stroke('#b38b2d');

  // Header stripe
  doc.roundedRect(65, 62, pageWidth - 130, 52, 8).fill('#0f4c81');

  // University logo (auto-load when image is available); otherwise draw a clean crest fallback.
  if (logoPath) {
    doc.image(logoPath, 78, logoY, { fit: [logoSize, logoSize], align: 'center', valign: 'center' });
    doc.image(logoPath, pageWidth - (78 + logoSize), logoY, {
      fit: [logoSize, logoSize],
      align: 'center',
      valign: 'center',
    });
  } else {
    doc.circle(95, 88, 16).lineWidth(1.2).fillAndStroke('#f8fafc', '#b38b2d');
    doc.circle(pageWidth - 95, 88, 16).lineWidth(1.2).fillAndStroke('#f8fafc', '#b38b2d');
    doc.fontSize(10).fillColor('#0f4c81').text('U', 90.7, 83.3);
    doc.fontSize(10).fillColor('#0f4c81').text('U', pageWidth - 99.3, 83.3);
  }

  doc
    .fillColor('#f8fafc')
    .fontSize(13)
    .text('UNIVERSITY COURSE MANAGEMENT SYSTEM', 65, 80, {
      width: pageWidth - 130,
      align: 'center',
    });

  // Accent line below header
  doc.moveTo(95, 130).lineTo(pageWidth - 95, 130).lineWidth(1.5).stroke('#b38b2d');

  // Badge
  doc.circle(centerX, 172, 26).lineWidth(2).stroke('#b38b2d');
  doc.fontSize(9).fillColor('#0f4c81').text('AWARD', centerX - 18, 166, { width: 36, align: 'center' });

  doc
    .fillColor('#111827')
    .fontSize(34)
    .text('CERTIFICATE', 0, 212, { align: 'center' });

  doc
    .fontSize(13)
    .fillColor('#374151')
    .text(certificate.title || 'Course Completion Certificate', 0, 252, { align: 'center' });

  doc
    .fontSize(12)
    .fillColor('#334155')
    .text('This is proudly presented to', 0, 296, { align: 'center' });

  doc
    .fontSize(28)
    .fillColor('#0b1f3a')
    .text(studentName, 85, 328, {
      width: pageWidth - 170,
      align: 'center',
      underline: true,
    });

  doc
    .fontSize(11)
    .fillColor('#475569')
    .text(`Roll Number: ${rollNumber}`, 0, 374, { align: 'center' });

  doc
    .fontSize(12)
    .fillColor('#334155')
    .text('for successful completion of', 0, 408, { align: 'center' });

  doc
    .fontSize(19)
    .fillColor('#0f4c81')
    .text(`${courseName} (${courseCode})`, 70, 438, {
      width: pageWidth - 140,
      align: 'center',
    });

  // Details panel
  doc.roundedRect(85, 494, pageWidth - 170, 88, 6).lineWidth(1).stroke('#cbd5e1');
  doc
    .fontSize(11)
    .fillColor('#1f2937')
    .text(`Certificate Number: ${certificate.certificateNumber}`, 102, 516, {
      width: pageWidth - 204,
      align: 'left',
    });
  doc
    .fontSize(11)
    .text(`Issue Date: ${issueDate}`, 102, 536, {
      width: pageWidth - 204,
      align: 'left',
    });
  doc
    .fontSize(11)
    .text(`Issued By: ${issuedBy}`, 102, 556, {
      width: pageWidth - 204,
      align: 'left',
    });

  if (certificate.remarks) {
    doc
      .fontSize(10)
      .fillColor('#4b5563')
      .text(`Remarks: ${certificate.remarks}`, 85, 596, {
        width: pageWidth - 170,
        align: 'center',
      });
  }

  // Signature area
  doc.moveTo(120, 700).lineTo(280, 700).lineWidth(1).stroke('#64748b');
  doc.moveTo(pageWidth - 280, 700).lineTo(pageWidth - 120, 700).lineWidth(1).stroke('#64748b');
  doc.fontSize(10).fillColor('#334155').text('Registrar', 120, 706, { width: 160, align: 'center' });
  doc.fontSize(10).fillColor('#334155').text('Authorized Signature', pageWidth - 280, 706, {
    width: 160,
    align: 'center',
  });

  // Footer line
  doc
    .fontSize(9)
    .fillColor('#64748b')
    .text('This certificate is system-generated and digitally verifiable.', 0, pageHeight - 62, { align: 'center' });

  doc.end();
};

const issueCertificate = asyncHandler(async (req, res) => {
  const { courseId, title, remarks } = req.body;
  const studentId = req.params.id;

  const student = await Student.findById(studentId).populate('course', 'name code');
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student not found' });
    req.flash('error', 'Student not found');
    return res.redirect('/students');
  }

  const course = await Course.findById(courseId || student.course?._id).select('name code');
  if (!course) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Valid course is required' });
    req.flash('error', 'Valid course is required');
    return res.redirect(`/students/${student._id}`);
  }

  const allowedCourseIds = new Set();
  if (student.course) allowedCourseIds.add(String(student.course._id));
  if (student.user) {
    const enrollments = await Enrollment.find({ user: student.user, status: 'enrolled' }).select('course');
    enrollments.forEach((entry) => allowedCourseIds.add(String(entry.course)));
  }

  if (!allowedCourseIds.has(String(course._id))) {
    if (wantsJson(req)) {
      return res.status(400).json({ message: 'Student is not enrolled in the selected course' });
    }
    req.flash('error', 'Student is not enrolled in the selected course');
    return res.redirect(`/students/${student._id}`);
  }

  const exists = await Certificate.findOne({ student: student._id, course: course._id });
  if (exists) {
    if (wantsJson(req)) return res.status(400).json({ message: 'Certificate already issued for this course' });
    req.flash('error', 'Certificate already issued for this course');
    return res.redirect(`/students/${student._id}`);
  }

  const certificate = await Certificate.create({
    certificateNumber: buildCertificateNumber(),
    student: student._id,
    course: course._id,
    title: title && String(title).trim() ? String(title).trim() : 'Course Completion Certificate',
    remarks: remarks || '',
    issueDate: new Date(),
    issuedBy: req.session.user._id,
  });

  if (wantsJson(req)) return res.status(201).json(certificate);
  req.flash('success', 'Certificate issued successfully');
  res.redirect(`/students/${student._id}`);
});

const getMyCertificates = asyncHandler(async (req, res) => {
  const student = await getStudentForSessionUser(req.session.user);
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student profile not found' });
    req.flash('error', 'Student profile not found');
    return res.redirect('/portal/my-courses');
  }

  const certificates = await Certificate.find({ student: student._id })
    .populate('course', 'name code')
    .populate('issuedBy', 'name')
    .sort({ issueDate: -1 });

  if (wantsJson(req)) return res.json(certificates);
  res.render('portal/certificates', { title: 'My Certificates', certificates, student });
});

const downloadMyCertificate = asyncHandler(async (req, res) => {
  const student = await getStudentForSessionUser(req.session.user);
  if (!student) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Student profile not found' });
    req.flash('error', 'Student profile not found');
    return res.redirect('/portal/my-courses');
  }

  const certificate = await Certificate.findById(req.params.id)
    .populate('student', 'name rollNumber')
    .populate('course', 'name code')
    .populate('issuedBy', 'name');

  if (!certificate || String(certificate.student._id) !== String(student._id)) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Certificate not found' });
    req.flash('error', 'Certificate not found');
    return res.redirect('/portal/certificates');
  }

  return streamCertificatePdf(res, certificate);
});

const downloadCertificateAdmin = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findById(req.params.id)
    .populate('student', 'name rollNumber')
    .populate('course', 'name code')
    .populate('issuedBy', 'name');

  if (!certificate) {
    if (wantsJson(req)) return res.status(404).json({ message: 'Certificate not found' });
    req.flash('error', 'Certificate not found');
    return res.redirect('/students');
  }

  return streamCertificatePdf(res, certificate);
});

module.exports = {
  issueCertificate,
  getMyCertificates,
  downloadMyCertificate,
  downloadCertificateAdmin,
  showCertificateVideos,
  completeCertificateVideos,
  claimCertificate,
};