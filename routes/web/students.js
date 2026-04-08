const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/studentController');
const certificateController = require('../../controllers/certificateController');
const { protect, admin } = require('../../middleware/authMiddleware');

// Public read
router.get('/', studentController.getStudents);

// Admin-only create/update/delete (order matters)
router.get('/new', protect, admin, studentController.showNewStudentForm);
router.get('/:id/edit', protect, admin, studentController.showEditStudentForm);
router.get('/certificates/:id/download', protect, admin, certificateController.downloadCertificateAdmin);
router.post('/', protect, admin, studentController.createStudent);
router.post('/:id/password', protect, admin, studentController.resetStudentPassword);
router.post('/:id/certificates', protect, admin, certificateController.issueCertificate);
router.put('/:id', protect, admin, studentController.updateStudent);
router.delete('/:id', protect, admin, studentController.deleteStudent);

// Read single (placed after more specific routes)
router.get('/:id', studentController.getStudent);

module.exports = router;
