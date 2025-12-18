// src/routes/auth.js
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const { User } = require('../models');
const { sendResetEmail, sendActivationEmail } = require('../../utils/mailer');
const { validate, schemas } = require('../middlewares/validate');
const { isNotAuthenticated } = require('../middlewares/auth');

const router = express.Router();

// Strict rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for registration (prevent automated signups)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registration attempts per window
  message: 'Too many registration attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for forgot password (prevent enumeration attacks)
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 forgot password requests per window
  message: 'Too many password reset requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Register page
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('auth/register', { title: 'Register - SkillSwap MY', csrfToken: req.csrfToken() });
});

// Register POST
router.post('/register', isNotAuthenticated, registerLimiter, validate(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash('error', 'Email already registered.');
      return res.redirect('/auth/register');
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Generate activation token - raw for email, hashed for storage
    const activationTokenRaw = crypto.randomBytes(32).toString('hex');
    const activationToken = crypto.createHash('sha256').update(activationTokenRaw).digest('hex');

    await User.create({
      name,
      email,
      passwordHash,
      activationToken,
      isVerified: false
    });

    try {
      await sendActivationEmail({
        to: email,
        name: name,
        token: activationTokenRaw // Send raw token in email
      });
    } catch (mailErr) {
      console.error('Send activation email failed:', mailErr.message);
      // In dev, log the token so we can activate manually
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV Activation Token] ${activationTokenRaw}`);
      }
    }

    req.flash('success', 'Registration successful! Please check your email to activate your account.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/auth/register');
  }
});

// Activation Route
router.get('/activate/:token', async (req, res) => {
  try {
    console.log('[DEBUG] Activation route hit with token:', req.params.token);
    const { token } = req.params;
    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ where: { activationToken: hashedToken } });
    console.log('[DEBUG] User found:', user ? user.email : 'No user');

    if (!user) {
      req.flash('error', 'Invalid or expired activation token.');
      return res.redirect('/auth/login');
    }

    await user.update({
      isVerified: true,
      activationToken: null
    });

    req.flash('success', 'Account activated successfully! You can now log in.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Activation error:', error);
    req.flash('error', 'Activation failed. Please try again.');
    res.redirect('/auth/login');
  }
});

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('auth/login', { title: 'Login', csrfToken: req.csrfToken() });
});

// Login POST
router.post('/login', isNotAuthenticated, loginLimiter, validate(schemas.login), (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info?.message || 'Invalid email or password.');
      return res.redirect('/auth/login');
    }
    if (!user.isVerified && user.role !== 'admin') {
      req.flash('error', 'Please verify your email address before logging in.');
      return res.redirect('/auth/login');
    }
    req.logIn(user, (err2) => {
      if (err2) return next(err2);
      req.flash('success', `Welcome back, ${user.name}!`);
      // Redirect admin users to admin panel, others to profile
      if (user.role === 'admin') {
        res.redirect('/admin');
      } else {
        res.redirect('/profile');
      }
    });
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'You have been logged out successfully.');
    res.redirect('/');
  });
});

/* ===========
   Forgot / Reset password
   =========== */

// Forgot page
router.get('/forgot', isNotAuthenticated, (req, res) => {
  res.render('auth/forgot', { title: 'Forgot Password - SkillSwap MY', csrfToken: req.csrfToken() });
});

// Forgot POST
router.post('/forgot', isNotAuthenticated, forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // 不暴露用户是否存在
    const user = await User.findOne({ where: { email } });

    // 统一返回
    const done = () => {
      req.flash('success', 'If an account exists, we sent a reset email.');
      return res.redirect('/auth/login');
    };

    if (!user) return done();

    // Generate token - raw for email, hashed for storage
    const resetTokenRaw = crypto.randomBytes(32).toString('hex');
    const resetToken = crypto.createHash('sha256').update(resetTokenRaw).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await user.update({ resetToken, resetTokenExpiry });

    let base = process.env.BASE_URL || 'http://localhost:3000';
    if (!base.startsWith('http')) base = `http://${base}`;
    if (base.endsWith('/')) base = base.slice(0, -1);

    const url = `${base}/auth/reset/${resetTokenRaw}`; // Use raw token in URL

    // 发邮件
    try {
      await sendResetEmail({
        to: user.email,
        name: user.name,
        token: resetTokenRaw, // Send raw token in email
      });
    } catch (mailErr) {
      console.error('Send email failed:', mailErr.message);
      // 开发环境给个兜底
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV reset URL]', url);
      }
    }

    return done();
  } catch (error) {
    console.error('Forgot password error:', error);
    req.flash('error', 'Something went wrong.');
    res.redirect('/auth/forgot');
  }
});

// Reset page
router.get('/reset/:token', isNotAuthenticated, async (req, res) => {
  try {
    const { token } = req.params;
    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      req.flash('error', 'Invalid or expired reset token.');
      return res.redirect('/auth/forgot');
    }

    res.render('auth/reset', { title: 'Reset Password - SkillSwap MY', token, csrfToken: req.csrfToken() });
  } catch (error) {
    console.error('Reset password page error:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/auth/forgot');
  }
});

// Reset POST
router.post('/reset/:token', isNotAuthenticated, validate(schemas.resetPassword), async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      req.flash('error', 'Invalid or expired reset token.');
      return res.redirect('/auth/forgot');
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await user.update({ passwordHash, resetToken: null, resetTokenExpiry: null });

    req.flash('success', 'Password reset successful! Please log in with your new password.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Reset password error:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/auth/forgot');
  }
});

module.exports = router;
