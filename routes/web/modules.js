const express = require('express');
const router = express.Router();
const moduleController = require('../../controllers/moduleController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/', moduleController.getModules);
router.get('/structured', moduleController.getStructuredModules);
router.get('/new', protect, admin, moduleController.showNewModuleForm);
router.get('/:id', moduleController.getModule);
router.get('/:id/edit', protect, admin, moduleController.showEditModuleForm);

router.post('/', protect, admin, moduleController.createModule);
router.put('/:id', protect, admin, moduleController.updateModule);
router.delete('/:id', protect, admin, moduleController.deleteModule);

module.exports = router;
