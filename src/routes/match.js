const express = require('express');
const matchingService = require('../services/matchingService');
const { User, UserSkill, Skill, Category } = require('../models');

const router = express.Router();

// Get matches page
router.get('/', async (req, res) => {
  try {
    const matches = await matchingService.findMatches(req.user.id);
    const me = await User.findByPk(req.user.id, {
      include: [
        {
          model: UserSkill,
          as: 'userSkills',
          include: [{ model: Skill, include: [Category] }]
        }
      ]
    });
    
    res.render('match/index', {
      title: 'Find Matches - SkillSwap MY',
      matches,
      me
    });
  } catch (error) {
    console.error('Match error:', error);
    req.session.error = 'Error finding matches.';
    res.redirect('/profile');
  }
});

module.exports = router; 