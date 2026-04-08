const express = require('express');
const router = express.Router();
const Department = require('../../models/Department');
const { protect, admin } = require('../../middleware/authMiddleware');

// Quick Add page: create Department and Course from one place
router.get('/quick-add', protect, admin, async (req, res, next) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.render('admin/quick-add', { title: 'Quick Add', departments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
