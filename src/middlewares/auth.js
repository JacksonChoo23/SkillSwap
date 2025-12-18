const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() || req.path === '/') {
    // Check if user is suspended or banned during active session
    if (req.user && (req.user.isBanned || (req.user.isSuspended && req.user.suspensionEndDate && new Date() < new Date(req.user.suspensionEndDate)))) {
      const reason = req.user.isBanned ? 'banned' : 'suspended';
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        req.flash('error', `Your session has been terminated because your account is ${reason}.`);
        res.redirect('/auth/login');
      });
      return;
    }
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