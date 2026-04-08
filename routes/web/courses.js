const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/courseController');
const moduleController = require('../../controllers/moduleController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/', courseController.getCourses);
router.get('/new', protect, admin, courseController.showNewCourseForm);
// Course-wise add module form (must come before '/:id')
router.get('/:id/modules/new', protect, admin, moduleController.showNewModuleForm);
router.get('/:id', courseController.getCourse);
router.get('/:id/edit', protect, admin, courseController.showEditCourseForm);

router.post('/', protect, admin, courseController.createCourse);
router.put('/:id', protect, admin, courseController.updateCourse);
router.delete('/:id', protect, admin, courseController.deleteCourse);

module.exports = router;
