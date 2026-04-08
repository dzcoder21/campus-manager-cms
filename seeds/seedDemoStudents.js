require('dotenv').config();
const mongoose = require('mongoose');

require('../models/Department');
const Course = require('../models/Course');
const User = require('../models/User');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/university-cms';

const studentTemplates = [
  {
    name: 'Aarav Singh',
    email: 'aarav.singh@example.com',
    rollNumber: 'CSE24001',
    year: 1,
    semester: 1,
    status: 'active',
    notes: 'Demo student account',
    password: 'Student@123',
    primaryCourseCode: 'BTCS',
    enrollmentCourseCodes: ['BTCS', 'BCA'],
  },
  {
    name: 'Diya Mehta',
    email: 'diya.mehta@example.com',
    rollNumber: 'CSE24002',
    year: 1,
    semester: 1,
    status: 'active',
    notes: 'Demo student account',
    password: 'Student@123',
    primaryCourseCode: 'BCA',
    enrollmentCourseCodes: ['BCA'],
  },
  {
    name: 'Rohan Verma',
    email: 'rohan.verma@example.com',
    rollNumber: 'CSE24003',
    year: 1,
    semester: 2,
    status: 'active',
    notes: 'Demo student account',
    password: 'Student@123',
    primaryCourseCode: 'MTDS',
    enrollmentCourseCodes: ['MTDS'],
  },
];

async function upsertUser(template) {
  const email = template.email.toLowerCase();
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({
      name: template.name,
      email,
      password: template.password,
      role: 'student',
      isActive: true,
    });
    await user.save();
    return { user, created: true };
  }

  user.name = template.name;
  user.role = 'student';
  user.isActive = true;
  await user.save();
  return { user, created: false };
}

async function upsertStudent(template, user, courseByCode, defaultDepartmentId) {
  const email = template.email.toLowerCase();
  const rollNumber = template.rollNumber.toUpperCase();
  const primaryCourse = courseByCode.get(template.primaryCourseCode);

  if (!primaryCourse) {
    throw new Error(`Primary course not found for code ${template.primaryCourseCode}`);
  }

  let student = await Student.findOne({ user: user._id });
  if (!student) {
    student = await Student.findOne({ email });
  }
  if (!student) {
    student = await Student.findOne({ rollNumber });
  }

  const isNew = !student;
  if (!student) {
    student = new Student();
  }

  student.name = template.name;
  student.email = email;
  student.rollNumber = rollNumber;
  student.department = primaryCourse.department || defaultDepartmentId;
  student.course = primaryCourse._id;
  student.year = template.year;
  student.semester = template.semester;
  student.status = template.status;
  student.notes = template.notes;
  student.user = user._id;
  await student.save();

  return { student, created: isNew };
}

async function upsertEnrollments(template, user, courseByCode) {
  let created = 0;
  let updated = 0;

  for (const code of template.enrollmentCourseCodes) {
    const course = courseByCode.get(code);
    if (!course) {
      continue;
    }

    let enrollment = await Enrollment.findOne({ user: user._id, course: course._id });
    if (!enrollment) {
      enrollment = new Enrollment({ user: user._id, course: course._id, status: 'enrolled' });
      created += 1;
    } else {
      enrollment.status = 'enrolled';
      updated += 1;
    }

    await enrollment.save();
  }

  return { created, updated };
}

async function run() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const requiredCourseCodes = ['BTCS', 'MTDS', 'BCA'];
    const courses = await Course.find({ code: { $in: requiredCourseCodes } }).select('_id code department');
    const courseByCode = new Map(courses.map((course) => [course.code, course]));

    if (courses.length === 0) {
      throw new Error('No demo courses found. Please run course seed first.');
    }

    const defaultDepartmentId = courses[0].department;

    let usersCreated = 0;
    let usersUpdated = 0;
    let studentsCreated = 0;
    let studentsUpdated = 0;
    let enrollmentsCreated = 0;
    let enrollmentsUpdated = 0;

    for (const template of studentTemplates) {
      const userResult = await upsertUser(template);
      if (userResult.created) usersCreated += 1;
      else usersUpdated += 1;

      const studentResult = await upsertStudent(
        template,
        userResult.user,
        courseByCode,
        defaultDepartmentId
      );
      if (studentResult.created) studentsCreated += 1;
      else studentsUpdated += 1;

      const enrollmentResult = await upsertEnrollments(template, userResult.user, courseByCode);
      enrollmentsCreated += enrollmentResult.created;
      enrollmentsUpdated += enrollmentResult.updated;
    }

    console.log(
      `Demo students ready. Users(C:${usersCreated}, U:${usersUpdated}) Students(C:${studentsCreated}, U:${studentsUpdated}) Enrollments(C:${enrollmentsCreated}, U:${enrollmentsUpdated})`
    );
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo students:', error.message);
    process.exit(1);
  }
}

run();
