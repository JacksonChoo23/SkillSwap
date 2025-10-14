// src/routes/auth.js
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User } = require('../models');
const { sendResetPasswordEmail } = require('../../utils/mailer');
const { validate, schemas } = require('../middlewares/validate');
const { isNotAuthenticated } = require('../middlewares/auth');

const router = express.Router();

// Register page
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('auth/register', { title: 'Register - SkillSwap MY', csrfToken: req.csrfToken() });
});

// Register POST
router.post('/register', isNotAuthenticated, validate(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.session.error = 'Email already registered.';
      return res.redirect('/auth/register');
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    await User.create({ name, email, passwordHash });

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
  res.render('auth/login', { title: 'Login - SkillSwap MY', csrfToken: req.csrfToken() });
});

// Login POST
router.post('/login', isNotAuthenticated, validate(schemas.login), (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.session.error = info?.message || 'Invalid email or password.';
      return res.redirect('/auth/login');
    }
    req.logIn(user, (err2) => {
      if (err2) return next(err2);
      req.session.user = { id: user.id };
      req.session.success = `Welcome back, ${user.name}!`;
      res.redirect('/profile');
    });
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.success = 'You have been logged out successfully.';
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
router.post('/forgot', isNotAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;

    // 不暴露用户是否存在
    const user = await User.findOne({ where: { email } });

    // 统一返回
    const done = () => {
      req.session.success = 'If an account exists, we sent a reset email.';
      return res.redirect('/auth/login');
    };

    if (!user) return done();

    // 生成 token + 过期时间
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await user.update({ resetToken, resetTokenExpiry });

    const base = process.env.BASE_URL || 'http://localhost:3000';
    const url = `${base}/auth/reset/${resetToken}`;

    // 发邮件
    try {
      await sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        url,
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
    req.session.error = 'Something went wrong.';
    res.redirect('/auth/forgot');
  }
});

// Reset page
router.get('/reset/:token', isNotAuthenticated, async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() } // 别再用 reset_expires_at
      }
    });

    if (!user) {
      req.session.error = 'Invalid or expired reset token.';
      return res.redirect('/auth/forgot');
    }

    res.render('auth/reset', { title: 'Reset Password - SkillSwap MY', token, csrfToken: req.csrfToken() });
  } catch (error) {
    console.error('Reset password page error:', error);
    req.session.error = 'An error occurred. Please try again.';
    res.redirect('/auth/forgot');
  }
});

// Reset POST
router.post('/reset/:token', isNotAuthenticated, async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match.';
      return res.redirect(`/auth/reset/${token}`);
    }
    if (!password || password.length < 8) {
      req.session.error = 'Password must be at least 8 characters long.';
      return res.redirect(`/auth/reset/${token}`);
    }

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      req.session.error = 'Invalid or expired reset token.';
      return res.redirect('/auth/forgot');
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await user.update({ passwordHash, resetToken: null, resetTokenExpiry: null });

    req.session.success = 'Password reset successful! Please log in with your new password.';
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Reset password error:', error);
    req.session.error = 'An error occurred. Please try again.';
    res.redirect('/auth/forgot');
  }
});

module.exports = router;
