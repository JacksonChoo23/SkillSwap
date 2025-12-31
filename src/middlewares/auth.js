const { User } = require('../models');

const isAuthenticated = async (req, res, next) => {
  if (req.isAuthenticated() || req.path === '/') {
    // Check if user is suspended or banned during active session
    if (req.user && req.user.isBanned) {
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        req.flash('account_terminated', JSON.stringify({
          type: 'banned',
          title: 'Account Permanently Banned',
          message: 'Your account has been permanently banned due to violation of our terms of service.'
        }));
        res.redirect('/auth/login');
      });
      return;
    }

    if (req.user && req.user.isSuspended && req.user.suspensionEndDate && new Date() < new Date(req.user.suspensionEndDate)) {
      const endDate = new Date(req.user.suspensionEndDate).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const suspensionReason = req.user.suspensionReason || 'Violation of terms of service';
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        req.flash('account_terminated', JSON.stringify({
          type: 'suspended',
          title: 'Account Suspended',
          message: `Your account has been suspended until ${endDate}.`,
          reason: suspensionReason
        }));
        res.redirect('/auth/login');
      });
      return;
    } else if (req.user && req.user.isSuspended && req.user.suspensionEndDate && new Date() >= new Date(req.user.suspensionEndDate)) {
      // Auto-unsuspend: Period has ended, clear flags and warnings
      try {
        await User.update({
          isSuspended: false,
          suspensionEndDate: null,
          suspensionReason: null,
          warningCount: 0
        }, {
          where: { id: req.user.id }
        });
        // Update the user object in the session
        req.user.isSuspended = false;
        req.user.suspensionEndDate = null;
        req.user.suspensionReason = null;
        req.user.warningCount = 0;
      } catch (error) {
        console.error('Error in auto-unsuspend cleanup:', error);
      }
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