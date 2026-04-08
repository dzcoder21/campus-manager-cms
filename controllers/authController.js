const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const wantsJson = require('../utils/wantsJson');

// Render login page
const showLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Admin Login' });
};

// Handle login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user || !(await user.matchPassword(password))) {
    if (wantsJson(req)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    req.flash('error', 'Invalid email or password');
    return res.redirect('/login');
  }

  req.session.user = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
  if (wantsJson(req)) {
    return res.json({ message: 'Logged in', user: req.session.user });
  }
  req.flash('success', 'Logged in successfully');
  res.redirect('/');
});

// Handle logout
const logout = (req, res) => {
  req.session.destroy(() => {
    if (wantsJson(req)) {
      return res.json({ message: 'Logged out' });
    }
    res.redirect('/login');
  });
};

module.exports = { showLogin, login, logout };
