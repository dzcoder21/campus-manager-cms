const mongoose = require('mongoose');
const Course = require('../models/Course');
const Department = require('../models/Department');
const asyncHandler = require('express-async-handler');
const wantsJson = require('../utils/wantsJson');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
    const { department, search } = req.query;
    let query = {};

    if (department) {
        query.department = department;
    }

    if (search) {
        query.$text = { $search: search };
    }

    const courses = await Course.find(query)
        .populate('department', 'name code')
        .sort({ name: 1 });
    
    if (wantsJson(req)) {
        return res.json(courses);
    }
    
    // For HTML response, get departments for filter dropdown
    const departments = await Department.find({}).sort({ name: 1 });
    
    res.render('courses/index', {
        title: 'All Courses',
        courses,
        departments,
        selectedDepartment: department || '',
        searchQuery: search || ''
    });
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
const getCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id)
        .populate('department', 'name code')
        .populate('modules');

    if (!course) {
        if (wantsJson(req)) {
            return res.status(404).json({ message: 'Course not found' });
        }
        req.flash('error', 'Course not found');
        return res.redirect('/courses');
    }

    if (wantsJson(req)) {
        return res.json(course);
    }

    res.render('courses/show', {
        title: course.name,
        course
    });
});

// @desc    Show new course form
// @route   GET /courses/new
// @access  Private/Admin
const showNewCourseForm = asyncHandler(async (req, res) => {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    
    if (departments.length === 0) {
        req.flash('error', 'No active departments found. Please create a department first.');
        return res.redirect('/departments/new');
    }
    
    res.render('courses/new', { 
        title: 'Add New Course',
        departments 
    });
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = asyncHandler(async (req, res) => {
    const { 
        name, 
        code, 
        department, 
        duration, 
        description, 
        credits, 
        fee, 
        startDate, 
        endDate 
    } = req.body;
    
    // Check if course with same code already exists
    const courseExists = await Course.findOne({ code });

    if (courseExists) {
        if (wantsJson(req)) {
            return res.status(400).json({ 
                message: 'Course with this code already exists' 
            });
        }
        req.flash('error', 'Course with this code already exists');
        return res.redirect('/courses/new');
    }

    // Validate end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
        if (wantsJson(req)) {
            return res.status(400).json({ 
                message: 'End date must be after start date' 
            });
        }
        req.flash('error', 'End date must be after start date');
        return res.redirect('/courses/new');
    }

    const course = new Course({
        name,
        code: code.toUpperCase(),
        department,
        duration: parseInt(duration),
        description,
        credits: parseInt(credits),
        fee: parseFloat(fee),
        startDate,
        endDate
    });

    const createdCourse = await course.save();

    if (wantsJson(req)) {
        return res.status(201).json(createdCourse);
    }

    req.flash('success', 'Course created successfully');
    res.redirect(`/courses/${createdCourse._id}`);
});

// @desc    Show edit course form
// @route   GET /courses/:id/edit
// @access  Private/Admin
const showEditCourseForm = asyncHandler(async (req, res) => {
    const [course, departments] = await Promise.all([
        Course.findById(req.params.id),
        Department.find({ isActive: true }).sort({ name: 1 })
    ]);

    if (!course) {
        req.flash('error', 'Course not found');
        return res.redirect('/courses');
    }

    // Format dates for date input fields
    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    };

    res.render('courses/edit', {
        title: 'Edit Course',
        course: {
            ...course._doc,
            startDate: formatDate(course.startDate),
            endDate: formatDate(course.endDate)
        },
        departments
    });
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
const updateCourse = asyncHandler(async (req, res) => {
    const { 
        name, 
        code, 
        department, 
        duration, 
        description, 
        credits, 
        fee, 
        startDate, 
        endDate,
        isActive
    } = req.body;
    
    const course = await Course.findById(req.params.id);

    if (!course) {
        if (wantsJson(req)) {
            return res.status(404).json({ message: 'Course not found' });
        }
        req.flash('error', 'Course not found');
        return res.redirect('/courses');
    }

    // Check if another course exists with the same code
    const courseExists = await Course.findOne({
        _id: { $ne: course._id },
        code: code.toUpperCase()
    });

    if (courseExists) {
        if (wantsJson(req)) {
            return res.status(400).json({ 
                message: 'Course with this code already exists' 
            });
        }
        req.flash('error', 'Course with this code already exists');
        return res.redirect(`/courses/${course._id}/edit`);
    }

    // Validate end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
        if (wantsJson(req)) {
            return res.status(400).json({ 
                message: 'End date must be after start date' 
            });
        }
        req.flash('error', 'End date must be after start date');
        return res.redirect(`/courses/${course._id}/edit`);
    }

    // Update course fields
    course.name = name;
    course.code = code.toUpperCase();
    course.department = department;
    course.duration = parseInt(duration);
    course.description = description;
    course.credits = parseInt(credits);
    course.fee = parseFloat(fee);
    course.startDate = startDate;
    course.endDate = endDate;
    course.isActive = isActive === 'on';

    const updatedCourse = await course.save();

    if (wantsJson(req)) {
        return res.json(updatedCourse);
    }

    req.flash('success', 'Course updated successfully');
    res.redirect(`/courses/${updatedCourse._id}`);
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        if (wantsJson(req)) {
            return res.status(404).json({ message: 'Course not found' });
        }
        req.flash('error', 'Course not found');
        return res.redirect('/courses');
    }

    // Check if there are any modules associated with this course
    const moduleCount = await mongoose.model('Module').countDocuments({ 
        course: course._id 
    });

    if (moduleCount > 0) {
        if (wantsJson(req)) {
            return res.status(400).json({ 
                message: 'Cannot delete course with associated modules' 
            });
        }
        req.flash('error', 'Cannot delete course with associated modules');
        return res.redirect(`/courses/${course._id}`);
    }

    await course.remove();

    if (wantsJson(req)) {
        return res.json({ message: 'Course removed' });
    }

    req.flash('success', 'Course deleted successfully');
    res.redirect('/courses');
});

module.exports = {
    getCourses,
    getCourse,
    showNewCourseForm,
    createCourse,
    showEditCourseForm,
    updateCourse,
    deleteCourse
};
