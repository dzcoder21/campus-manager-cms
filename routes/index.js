const express = require('express');
const router = express.Router();
const wantsJson = require('../utils/wantsJson');

// Auth routes
router.use('/', require('./auth'));

// Home page
router.get('/', (req, res) => {
    res.render('index', { title: 'University CMS - Home' });
});

// API routes
router.use('/api/departments', require('./api/departments'));
router.use('/api/courses', require('./api/courses'));
router.use('/api/modules', require('./api/modules'));
router.use('/api/students', require('./api/students'));
router.use('/api/assistant', require('./api/assistant'));

// Web routes
router.use('/departments', require('./web/departments'));
router.use('/courses', require('./web/courses'));
router.use('/modules', require('./web/modules'));
router.use('/admin', require('./web/admin'));
router.use('/students', require('./web/students'));
router.use('/catalog', require('./web/catalog'));
router.use('/portal', require('./web/portal'));

// 404 handler
router.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

// Error handler
router.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    if (wantsJson(req)) {
        return res.status(statusCode).json({ 
            success: false, 
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
    
    res.status(statusCode).render('error', {
        title: `${statusCode} - ${message}`,
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = router;
