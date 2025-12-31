const express = require('express');
const router = express.Router();
const { User, LearningSession, Skill } = require('../models');
const sequelize = require('sequelize');

// Dashboard route
router.get('/', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }

  try {
    const userId = req.user.id;

    console.log('User ID:', userId);

    // Fetch user-specific data
    const totalSessions = await LearningSession.count({
      where: {
        [sequelize.Op.or]: [
          { teacherId: userId },
          { studentId: userId }
        ]
      }
    });

    console.log('Total Sessions:', totalSessions);

    const totalSkills = await Skill.count({ where: { userId } });
    const recentSessions = await LearningSession.findAll({
      where: { userId },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    res.render('home', {
      title: 'Dashboard - SkillSwap MY',
      user: req.user,
      totalSessions,
      totalSkills,
      recentSessions
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// API endpoint for real-time account status check
router.get('/api/account-status', async (req, res) => {
  // If not authenticated, return not-authenticated status
  if (!req.isAuthenticated() || !req.user) {
    return res.json({ authenticated: false });
  }

  try {
    // Fetch fresh user data from database
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.json({ authenticated: false });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.json({
        authenticated: true,
        terminated: true,
        type: 'banned',
        title: 'Account Permanently Banned',
        message: 'Your account has been permanently banned due to violation of our terms of service.'
      });
    }

    // Check if user is suspended
    if (user.isSuspended && user.suspensionEndDate && new Date() < new Date(user.suspensionEndDate)) {
      const endDate = new Date(user.suspensionEndDate).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return res.json({
        authenticated: true,
        terminated: true,
        type: 'suspended',
        title: 'Account Suspended',
        message: `Your account has been suspended until ${endDate}.`,
        reason: user.suspensionReason || 'Violation of terms of service'
      });
    }

    // Account is fine
    return res.json({
      authenticated: true,
      terminated: false
    });
  } catch (error) {
    console.error('Account status check error:', error);
    return res.json({ authenticated: true, terminated: false });
  }
});

module.exports = router;