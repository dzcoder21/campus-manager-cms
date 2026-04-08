const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/courseController');
const { protect, admin } = require('../../middleware/authMiddleware');

// GET /api/courses - Get all courses
router.get('/', courseController.getCourses);

// GET /api/courses/:id - Get single course
router.get('/:id', courseController.getCourse);

// POST /api/courses - Create new course
router.post('/', protect, admin, courseController.createCourse);

// PUT /api/courses/:id - Update course
router.put('/:id', protect, admin, courseController.updateCourse);

// DELETE /api/courses/:id - Delete course
router.delete('/:id', protect, admin, courseController.deleteCourse);

module.exports = router;
