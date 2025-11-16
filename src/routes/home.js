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

module.exports = router;