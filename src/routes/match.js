const express = require('express');
const matchingService = require('../services/matchingService');

const router = express.Router();

// Get matches page
router.get('/', async (req, res) => {
  try {
    const matches = await matchingService.findMatches(req.user.id);
    
    res.render('match/index', {
      title: 'Find Matches - SkillSwap MY',
      matches
    });
  } catch (error) {
    console.error('Match error:', error);
    req.session.error = 'Error finding matches.';
    res.redirect('/profile');
  }
});

module.exports = router; 