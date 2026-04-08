const express = require('express');
const router = express.Router();
const moduleController = require('../../controllers/moduleController');
const { protect, admin } = require('../../middleware/authMiddleware');

// GET /api/modules - Get all modules
router.get('/', moduleController.getModules);

// GET /api/modules/structured - Get structured modules grouped by Department > Course > Semester
router.get('/structured', moduleController.getStructuredModules);

// GET /api/modules/:id - Get single module
router.get('/:id', moduleController.getModule);

// POST /api/modules - Create new module
router.post('/', protect, admin, moduleController.createModule);

// PUT /api/modules/:id - Update module
router.put('/:id', protect, admin, moduleController.updateModule);

// DELETE /api/modules/:id - Delete module
router.delete('/:id', protect, admin, moduleController.deleteModule);

module.exports = router;
