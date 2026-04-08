const express = require('express');
const router = express.Router();
const Department = require('../../models/Department');
const Course = require('../../models/Course');
const Module = require('../../models/Module');

// Catalog landing: list departments and featured courses
router.get('/', async (req, res, next) => {
  try {
    const [departments, courses] = await Promise.all([
      Department.find({ isActive: true }).sort({ name: 1 }),
      Course.find({ isActive: true }).populate('department', 'name code').sort({ name: 1 }).limit(12),
    ]);
    res.render('catalog/index', { title: 'Catalog', departments, courses });
  } catch (err) {
    next(err);
  }
});

// View a department: show its courses
router.get('/department/:id', async (req, res, next) => {
  try {
    const [department, courses] = await Promise.all([
      Department.findById(req.params.id),
      Course.find({ department: req.params.id, isActive: true }).sort({ name: 1 }),
    ]);
    if (!department) {
      return res.status(404).render('error', { title: 'Not Found', message: 'Department not found' });
    }
    res.render('catalog/department', { title: department.name, department, courses });
  } catch (err) {
    next(err);
  }
});

// View a course: show its modules grouped by semester
router.get('/course/:id', async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('department', 'name code');
    if (!course) {
      return res.status(404).render('error', { title: 'Not Found', message: 'Course not found' });
    }
    const modules = await Module.find({ course: course._id })
      .sort({ semester: 1, name: 1 });
    const bySemester = modules.reduce((acc, m) => {
      const s = Number(m.semester) || 0;
      if (!acc[s]) acc[s] = [];
      acc[s].push(m);
      return acc;
    }, {});
    const semesters = Object.keys(bySemester).sort((a,b)=>Number(a)-Number(b));
    res.render('catalog/course', { title: course.name, course, bySemester, semesters });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
