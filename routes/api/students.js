const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/studentController');
const { protect, admin } = require('../../middleware/authMiddleware');

// Public read endpoints
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudent);

// Admin CRUD
router.post('/', protect, admin, studentController.createStudent);
router.put('/:id', protect, admin, studentController.updateStudent);
router.delete('/:id', protect, admin, studentController.deleteStudent);

module.exports = router;
