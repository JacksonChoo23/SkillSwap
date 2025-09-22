const express = require('express');
const matchingService = require('../services/matchingService');
const { User, UserSkill, Skill, Category, Notification } = require('../models');

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

async function notifyUserForMatch(userId, matchDetails) {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      console.error(`User with ID ${userId} not found.`);
      return;
    }

    // Create a notification
    await Notification.create({
      userId,
      title: 'New Match Found!',
      message: `You have a new match: ${matchDetails}.`,
      status: 'unread',
    });

    // Send email if no WhatsApp number
    if (!user.whatsappNumber) {
      sendEmail(user.email, 'New Match Notification', `You have a new match: ${matchDetails}.`);
    }
  } catch (error) {
    console.error('Error notifying user for match:', error);
  }
}

function sendEmail(to, subject, body) {
  // Placeholder for email sending logic
  console.log(`Sending email to ${to}: ${subject} - ${body}`);
}

// Example usage
router.post('/notify-match', async (req, res) => {
  const { userId, matchDetails } = req.body;

  await notifyUserForMatch(userId, matchDetails);

  res.status(200).send({ message: 'Notification sent.' });
});

module.exports = router;