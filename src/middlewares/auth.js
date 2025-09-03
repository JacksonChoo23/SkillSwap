const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.error = 'Please log in to access this page.';
  res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  req.session.error = 'Access denied. Admin privileges required.';
  res.redirect('/');
};

const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/profile');
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isNotAuthenticated
}; 