const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User } = require('../models');
const { validate, schemas } = require('../middlewares/validate');
const { isNotAuthenticated } = require('../middlewares/auth');

const router = express.Router();

// Register page
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('auth/register', { title: 'Register - SkillSwap MY' });
});

// Register POST
router.post('/register', isNotAuthenticated, validate(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.session.error = 'Email already registered.';
      return res.redirect('/auth/register');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Create user
    await User.create({
      name,
      email,
      passwordHash
    });

    req.session.success = 'Registration successful! Please log in.';
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.session.error = 'Registration failed. Please try again.';
    res.redirect('/auth/register');
  }
});

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('auth/login', { title: 'Login - SkillSwap MY' });
});

// Login POST
router.post('/login', isNotAuthenticated, validate(schemas.login), (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.session.error = info.message || 'Invalid email or password.';
      return res.redirect('/auth/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      req.session.success = `Welcome back, ${user.name}!`;
      res.redirect('/profile');
    });
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.success = 'You have been logged out successfully.';
    res.redirect('/');
  });
});

// Forgot password page
router.get('/forgot', isNotAuthenticated, (req, res) => {
  res.render('auth/forgot', { title: 'Forgot Password - SkillSwap MY' });
});

// Forgot password POST
router.post('/forgot', isNotAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      req.session.error = 'If an account with that email exists, a reset link has been sent.';
      return res.redirect('/auth/forgot');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
      resetToken,
      resetTokenExpiry
    });

    // In development, print token to console
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset token:', resetToken);
      console.log('Reset URL:', `${process.env.BASE_URL}/auth/reset/${resetToken}`);
    }

    req.session.success = 'If an account with that email exists, a reset link has been sent.';
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Forgot password error:', error);
    req.session.error = 'An error occurred. Please try again.';
    res.redirect('/auth/forgot');
  }
});

// Reset password page
router.get('/reset/:token', isNotAuthenticated, async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      req.session.error = 'Invalid or expired reset token.';
      return res.redirect('/auth/forgot');
    }

    res.render('auth/reset', { 
      title: 'Reset Password - SkillSwap MY',
      token 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    req.session.error = 'An error occurred. Please try again.';
    res.redirect('/auth/forgot');
  }
});

// Reset password POST
router.post('/reset/:token', isNotAuthenticated, async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match.';
      return res.redirect(`/auth/reset/${token}`);
    }

    if (password.length < 8) {
      req.session.error = 'Password must be at least 8 characters long.';
      return res.redirect(`/auth/reset/${token}`);
    }

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      req.session.error = 'Invalid or expired reset token.';
      return res.redirect('/auth/forgot');
    }

    // Update password and clear reset token
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await user.update({
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null
    });

    req.session.success = 'Password reset successful! Please log in with your new password.';
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Reset password error:', error);
    req.session.error = 'An error occurred. Please try again.';
    res.redirect('/auth/forgot');
  }
});

module.exports = router; 