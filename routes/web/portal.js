const express = require('express');
const router = express.Router();
const { requireRole, protect } = require('../../middleware/authMiddleware');
const { getMyCourses, enrollInCourse, dropFromCourse } = require('../../controllers/enrollmentController');
const { getMyCertificates, downloadMyCertificate, showCertificateVideos, completeCertificateVideos, claimCertificate } = require('../../controllers/certificateController');

// Student portal routes
router.get('/my-courses', protect, requireRole('student'), getMyCourses);
router.get('/certificates', protect, requireRole('student'), getMyCertificates);
router.get('/certificates/:id/download', protect, requireRole('student'), downloadMyCertificate);
router.get('/certificate-videos', protect, requireRole('student'), showCertificateVideos);
router.post('/certificate-videos/complete', protect, requireRole('student'), completeCertificateVideos);
router.post('/claim-certificate', protect, requireRole('student'), claimCertificate);
router.post('/enroll', protect, requireRole('student'), enrollInCourse);
router.post('/drop', protect, requireRole('student'), dropFromCourse);

module.exports = router;
