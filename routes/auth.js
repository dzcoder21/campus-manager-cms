const express = require('express');
const router = express.Router();
const { showLogin, login, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.get('/login', showLogin);
router.post('/login', login);
router.post('/logout', protect, logout);

module.exports = router;
