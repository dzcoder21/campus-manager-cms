const mongoose = require('mongoose');
const Department = require('../models/Department');
const asyncHandler = require('express-async-handler');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
const getDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find({}).sort({ name: 1 });
    
    if (req.accepts('json')) {
        return res.json(departments);
    }
    
    res.render('departments/index', {
        title: 'All Departments',
        departments
    });
});

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Public
const getDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id)
        .populate('courses');

    if (!department) {
        if (req.accepts('json')) {
            return res.status(404).json({ message: 'Department not found' });
        }
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
    }

    if (req.accepts('json')) {
        return res.json(department);
    }

    res.render('departments/show', {
        title: department.name,
        department
    });
});

// @desc    Show new department form
// @route   GET /departments/new
// @access  Private/Admin
const showNewDepartmentForm = (req, res) => {
    res.render('departments/new', { title: 'Add New Department' });
};

// @desc    Create new department
// @route   POST /api/departments
// @access  Private/Admin
const createDepartment = asyncHandler(async (req, res) => {
    const { name, code, description, headOfDepartment } = req.body;
    
    const departmentExists = await Department.findOne({ 
        $or: [{ name }, { code }] 
    });

    if (departmentExists) {
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Department with this name or code already exists' 
            });
        }
        req.flash('error', 'Department with this name or code already exists');
        return res.redirect('/departments/new');
    }

    const department = new Department({
        name,
        code: code.toUpperCase(),
        description,
        headOfDepartment
    });

    const createdDepartment = await department.save();

    if (req.accepts('json')) {
        return res.status(201).json(createdDepartment);
    }

    req.flash('success', 'Department created successfully');
    res.redirect(`/departments/${createdDepartment._id}`);
});

// @desc    Show edit department form
// @route   GET /departments/:id/edit
// @access  Private/Admin
const showEditDepartmentForm = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id);

    if (!department) {
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
    }

    res.render('departments/edit', {
        title: 'Edit Department',
        department
    });
});

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
const updateDepartment = asyncHandler(async (req, res) => {
    const { name, code, description, headOfDepartment, isActive } = req.body;
    
    const department = await Department.findById(req.params.id);

    if (!department) {
        if (req.accepts('json')) {
            return res.status(404).json({ message: 'Department not found' });
        }
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
    }

    // Check if another department exists with the same name or code
    const departmentExists = await Department.findOne({
        _id: { $ne: department._id },
        $or: [
            { name },
            { code: code.toUpperCase() }
        ]
    });

    if (departmentExists) {
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Department with this name or code already exists' 
            });
        }
        req.flash('error', 'Department with this name or code already exists');
        return res.redirect(`/departments/${department._id}/edit`);
    }

    department.name = name;
    department.code = code.toUpperCase();
    department.description = description;
    department.headOfDepartment = headOfDepartment;
    department.isActive = isActive === 'on';

    const updatedDepartment = await department.save();

    if (req.accepts('json')) {
        return res.json(updatedDepartment);
    }

    req.flash('success', 'Department updated successfully');
    res.redirect(`/departments/${updatedDepartment._id}`);
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
const deleteDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id);

    if (!department) {
        if (req.accepts('json')) {
            return res.status(404).json({ message: 'Department not found' });
        }
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
    }

    // Check if there are any courses associated with this department
    const courseCount = await mongoose.model('Course').countDocuments({ 
        department: department._id 
    });

    if (courseCount > 0) {
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Cannot delete department with associated courses' 
            });
        }
        req.flash('error', 'Cannot delete department with associated courses');
        return res.redirect(`/departments/${department._id}`);
    }

    await department.remove();

    if (req.accepts('json')) {
        return res.json({ message: 'Department removed' });
    }

    req.flash('success', 'Department deleted successfully');
    res.redirect('/departments');
});

module.exports = {
    getDepartments,
    getDepartment,
    showNewDepartmentForm,
    createDepartment,
    showEditDepartmentForm,
    updateDepartment,
    deleteDepartment
};
