const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { User } = require('../models');

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return done(null, false, { message: 'Invalid email or password.' });
    }

    if (user.isBanned) {
      return done(null, false, { message: 'Your account has been permanently banned.' });
    }

    if (user.isSuspended && user.suspensionEndDate && new Date() < new Date(user.suspensionEndDate)) {
      const dateStr = new Date(user.suspensionEndDate).toLocaleString('en-MY', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return done(null, false, { message: `Account suspended until ${dateStr}. Reason: ${user.suspensionReason || 'Violation of terms'}` });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return done(null, false, { message: 'Invalid email or password.' });
    }

    // Auto-unsuspend cleanup if period has expired
    if (user.isSuspended && user.suspensionEndDate && new Date() >= new Date(user.suspensionEndDate)) {
      await user.update({
        isSuspended: false,
        suspensionEndDate: null,
        suspensionReason: null,
        warningCount: 0
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    // Always deserialize user (even if banned/suspended)
    // The middleware will handle the logout and messaging
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport; 