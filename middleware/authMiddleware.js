const wantsJson = require('../utils/wantsJson');

function protect(req, res, next) {
  if (req.session && req.session.user && req.session.user.isActive !== false) {
    return next();
  }
  if (wantsJson(req)) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  req.flash('error', 'Please log in to continue');
  return res.redirect('/login');
}

function admin(req, res, next) {
  const user = req.session && req.session.user;
  if (user && user.role === 'admin' && user.isActive !== false) {
    return next();
  }
  if (wantsJson(req)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  req.flash('error', 'Admin access required');
  return res.redirect('/');
}

function requireRole(role) {
  return (req, res, next) => {
    const user = req.session && req.session.user;
    if (user && user.role === role && user.isActive !== false) {
      return next();
    }
    if (wantsJson(req)) {
      return res.status(403).json({ message: `${role} access required` });
    }
    req.flash('error', `${role} access required`);
    return res.redirect('/login');
  };
}

module.exports = { protect, admin, requireRole };
