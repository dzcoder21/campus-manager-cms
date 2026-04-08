const Module = require('../models/Module');
const Course = require('../models/Course');
const Department = require('../models/Department');
const asyncHandler = require('express-async-handler');

// @desc    Get all modules
// @route   GET /api/modules
// @access  Public
const getModules = asyncHandler(async (req, res) => {
    const { course, department, semester, search } = req.query;
    let query = {};

    if (course) {
        query.course = course;
    }
    
    if (department) {
        query.department = department;
    }
    
    if (semester) {
        query.semester = parseInt(semester);
    }

    if (search) {
        query.$text = { $search: search };
    }

    const modules = await Module.find(query)
        .populate('course', 'name code')
        .populate('department', 'name code')
        .populate('prerequisites', 'name code')
        .sort({ semester: 1, name: 1 });
    
    if (req.accepts('json')) {
        return res.json(modules);
    }
    
    // For HTML response, get courses and departments for filter dropdowns
    const [courses, departments] = await Promise.all([
        Course.find({}).sort({ name: 1 }),
        Department.find({}).sort({ name: 1 })
    ]);
    
    // Generate semester options (1-12)
    const semesters = Array.from({ length: 12 }, (_, i) => i + 1);
    
    res.render('modules/index', {
        title: 'All Modules',
        modules,
        courses,
        departments,
        semesters,
        filters: {
            course: course || '',
            department: department || '',
            semester: semester || '',
            search: search || ''
        }
    });
});

// @desc    Get structured modules grouped by Department > Course > Semester
// @route   GET /api/modules/structured
// @access  Public
const getStructuredModules = asyncHandler(async (req, res) => {
    // Load all relevant entities
    const [departments, courses, modules] = await Promise.all([
        Department.find({}).sort({ name: 1 }),
        Course.find({}).sort({ name: 1 }),
        Module.find({})
            .populate('course', 'name code department')
            .populate('department', 'name code')
            .sort({ semester: 1, name: 1 })
    ]);

    // Build a nested structure: dept -> course -> semester -> modules
    const structure = {};

    departments.forEach(dep => {
        structure[dep._id] = {
            _id: dep._id,
            name: dep.name,
            code: dep.code,
            courses: {}
        };
    });

    courses.forEach(course => {
        const depId = String(course.department);
        if (!structure[depId]) return; // skip if department missing
        structure[depId].courses[course._id] = {
            _id: course._id,
            name: course.name,
            code: course.code,
            semesters: {}
        };
    });

    modules.forEach(m => {
        const depId = m.department ? String(m.department._id || m.department) : (m.course && m.course.department ? String(m.course.department) : null);
        if (!depId || !structure[depId]) return;
        const courseId = m.course ? String(m.course._id || m.course) : null;
        if (!courseId || !structure[depId].courses[courseId]) return;
        const sem = Number(m.semester) || 0;
        if (!structure[depId].courses[courseId].semesters[sem]) {
            structure[depId].courses[courseId].semesters[sem] = [];
        }
        structure[depId].courses[courseId].semesters[sem].push(m);
    });

    if (req.accepts('json')) {
        return res.json(structure);
    }

    res.render('modules/structured', {
        title: 'Modules Structure',
        structure
    });
});

// @desc    Get single module
// @route   GET /api/modules/:id
// @access  Public
const getModule = asyncHandler(async (req, res) => {
    const module = await Module.findById(req.params.id)
        .populate('course', 'name code')
        .populate('department', 'name code')
        .populate('prerequisites', 'name code');

    if (!module) {
        if (req.accepts('json')) {
            return res.status(404).json({ message: 'Module not found' });
        }
        req.flash('error', 'Module not found');
        return res.redirect('/modules');
    }

    if (req.accepts('json')) {
        return res.json(module);
    }

    res.render('modules/show', {
        title: module.name,
        module
    });
});

// @desc    Show new module form (supports pre-selecting course via ?course=:id or /courses/:id/modules/new)
// @route   GET /modules/new
// @route   GET /courses/:id/modules/new
// @access  Private/Admin
const showNewModuleForm = asyncHandler(async (req, res) => {
    const preselectedCourseId = req.query.course || req.params.id || '';

    const [courses, departments, existingModules, preselectedCourse] = await Promise.all([
        Course.find({ isActive: true }).sort({ name: 1 }),
        Department.find({ isActive: true }).sort({ name: 1 }),
        Module.find({}).sort({ name: 1 }),
        preselectedCourseId ? Course.findById(preselectedCourseId) : null
    ]);
    
    if (courses.length === 0) {
        req.flash('error', 'No active courses found. Please create a course first.');
        return res.redirect('/courses/new');
    }

    // Determine preselected department if a course is selected
    let preselectedDepartmentId = '';
    if (preselectedCourse) {
        preselectedDepartmentId = String(preselectedCourse.department);
    }
    
    res.render('modules/new', { 
        title: 'Add New Module',
        courses,
        departments,
        existingModules,
        semesters: Array.from({ length: 12 }, (_, i) => i + 1),
        preselectedCourseId,
        preselectedDepartmentId
    });
});

// @desc    Create new module
// @route   POST /api/modules
// @access  Private/Admin
const createModule = asyncHandler(async (req, res) => {
    const { 
        name, 
        code, 
        course, 
        department, 
        description, 
        credits, 
        semester, 
        isCore, 
        lecturer, 
        learningOutcomes,
        examWeight,
        courseworkWeight,
        practicalWeight,
        prerequisites = []
    } = req.body;
    
    // Check if module with same code already exists
    const moduleExists = await Module.findOne({ code });

    if (moduleExists) {
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Module with this code already exists' 
            });
        }
        req.flash('error', 'Module with this code already exists');
        return res.redirect('/modules/new');
    }

    // Process learning outcomes (split by newline and trim)
    const processedLearningOutcomes = learningOutcomes
        ? learningOutcomes.split('\n')
            .map(lo => lo.trim())
            .filter(lo => lo.length > 0)
        : [];

    // Process assessment weights
    const assessmentMethods = {
        exam: parseFloat(examWeight) || 0,
        coursework: parseFloat(courseworkWeight) || 0,
        practical: parseFloat(practicalWeight) || 0
    };

    // Ensure weights sum to 100
    const totalWeight = Object.values(assessmentMethods).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) { // Allow for floating point imprecision
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Assessment weights must sum to 100%' 
            });
        }
        req.flash('error', 'Assessment weights must sum to 100%');
        return res.redirect('/modules/new');
    }

    const module = new Module({
        name,
        code: code.toUpperCase(),
        course,
        department,
        description,
        credits: parseInt(credits),
        semester: parseInt(semester),
        isCore: isCore === 'on',
        lecturer,
        learningOutcomes: processedLearningOutcomes,
        assessmentMethods,
        prerequisites: Array.isArray(prerequisites) ? prerequisites : [prerequisites].filter(Boolean)
    });

    const createdModule = await module.save();

    if (req.accepts('json')) {
        return res.status(201).json(createdModule);
    }

    req.flash('success', 'Module created successfully');
    res.redirect(`/modules/${createdModule._id}`);
});

// @desc    Show edit module form
// @route   GET /modules/:id/edit
// @access  Private/Admin
const showEditModuleForm = asyncHandler(async (req, res) => {
    const [module, courses, departments, existingModules] = await Promise.all([
        Module.findById(req.params.id),
        Course.find({ isActive: true }).sort({ name: 1 }),
        Department.find({ isActive: true }).sort({ name: 1 }),
        Module.find({ _id: { $ne: req.params.id } }).sort({ name: 1 })
    ]);

    if (!module) {
        req.flash('error', 'Module not found');
        return res.redirect('/modules');
    }

    res.render('modules/edit', {
        title: 'Edit Module',
        module: {
            ...module._doc,
            learningOutcomes: module.learningOutcomes.join('\n'),
            examWeight: module.assessmentMethods.exam,
            courseworkWeight: module.assessmentMethods.coursework,
            practicalWeight: module.assessmentMethods.practical
        },
        courses,
        departments,
        existingModules,
        semesters: Array.from({ length: 12 }, (_, i) => i + 1)
    });
});

// @desc    Update module
// @route   PUT /api/modules/:id
// @access  Private/Admin
const updateModule = asyncHandler(async (req, res) => {
    const { 
        name, 
        code, 
        course, 
        department, 
        description, 
        credits, 
        semester, 
        isCore, 
        lecturer, 
        learningOutcomes,
        examWeight,
        courseworkWeight,
        practicalWeight,
        prerequisites = []
    } = req.body;
    
    const module = await Module.findById(req.params.id);

    if (!module) {
        if (req.accepts('json')) {
            return res.status(404).json({ message: 'Module not found' });
        }
        req.flash('error', 'Module not found');
        return res.redirect('/modules');
    }

    // Check if another module exists with the same code
    const moduleExists = await Module.findOne({
        _id: { $ne: module._id },
        code: code.toUpperCase()
    });

    if (moduleExists) {
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Module with this code already exists' 
            });
        }
        req.flash('error', 'Module with this code already exists');
        return res.redirect(`/modules/${module._id}/edit`);
    }

    // Process learning outcomes
    const processedLearningOutcomes = learningOutcomes
        ? learningOutcomes.split('\n')
            .map(lo => lo.trim())
            .filter(lo => lo.length > 0)
        : [];

    // Process assessment weights
    const assessmentMethods = {
        exam: parseFloat(examWeight) || 0,
        coursework: parseFloat(courseworkWeight) || 0,
        practical: parseFloat(practicalWeight) || 0
    };

    // Ensure weights sum to 100
    const totalWeight = Object.values(assessmentMethods).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) { // Allow for floating point imprecision
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Assessment weights must sum to 100%' 
            });
        }
        req.flash('error', 'Assessment weights must sum to 100%');
        return res.redirect(`/modules/${module._id}/edit`);
    }

    // Update module fields
    module.name = name;
    module.code = code.toUpperCase();
    module.course = course;
    module.department = department;
    module.description = description;
    module.credits = parseInt(credits);
    module.semester = parseInt(semester);
    module.isCore = isCore === 'on';
    module.lecturer = lecturer;
    module.learningOutcomes = processedLearningOutcomes;
    module.assessmentMethods = assessmentMethods;
    module.prerequisites = Array.isArray(prerequisites) ? prerequisites : [prerequisites].filter(Boolean);

    const updatedModule = await module.save();

    if (req.accepts('json')) {
        return res.json(updatedModule);
    }

    req.flash('success', 'Module updated successfully');
    res.redirect(`/modules/${updatedModule._id}`);
});

// @desc    Delete module
// @route   DELETE /api/modules/:id
// @access  Private/Admin
const deleteModule = asyncHandler(async (req, res) => {
    const module = await Module.findById(req.params.id);

    if (!module) {
        if (req.accepts('json')) {
            return res.status(404).json({ message: 'Module not found' });
        }
        req.flash('error', 'Module not found');
        return res.redirect('/modules');
    }

    // Check if this module is a prerequisite for any other modules
    const isPrerequisite = await Module.exists({ prerequisites: module._id });

    if (isPrerequisite) {
        if (req.accepts('json')) {
            return res.status(400).json({ 
                message: 'Cannot delete module as it is a prerequisite for other modules' 
            });
        }
        req.flash('error', 'Cannot delete module as it is a prerequisite for other modules');
        return res.redirect(`/modules/${module._id}`);
    }

    await module.remove();

    if (req.accepts('json')) {
        return res.json({ message: 'Module removed' });
    }

    req.flash('success', 'Module deleted successfully');
    res.redirect('/modules');
});

module.exports = {
    getModules,
    getModule,
    showNewModuleForm,
    createModule,
    showEditModuleForm,
    updateModule,
    deleteModule,
    getStructuredModules
};
