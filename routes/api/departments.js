const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/departmentController');
const { protect, admin } = require('../../middleware/authMiddleware');

// GET /api/departments - Get all departments
router.get('/', departmentController.getDepartments);

// GET /api/departments/:id - Get single department
router.get('/:id', departmentController.getDepartment);

// POST /api/departments - Create new department
router.post('/', protect, admin, departmentController.createDepartment);

// PUT /api/departments/:id - Update department
router.put('/:id', protect, admin, departmentController.updateDepartment);

// DELETE /api/departments/:id - Delete department
router.delete('/:id', protect, admin, departmentController.deleteDepartment);

module.exports = router;
