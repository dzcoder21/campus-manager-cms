const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/departmentController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/', departmentController.getDepartments);
router.get('/new', protect, admin, departmentController.showNewDepartmentForm);
router.get('/:id', departmentController.getDepartment);
router.get('/:id/edit', protect, admin, departmentController.showEditDepartmentForm);

router.post('/', protect, admin, departmentController.createDepartment);
router.put('/:id', protect, admin, departmentController.updateDepartment);
router.delete('/:id', protect, admin, departmentController.deleteDepartment);

module.exports = router;
