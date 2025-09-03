const express = require('express');
const { User, UserSkill, Availability, Skill, Category } = require('../models');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// Profile page
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: UserSkill,
          as: 'userSkills',
          include: [{ model: Skill, include: [Category] }]
        },
        {
          model: Availability,
          as: 'availabilities'
        }
      ]
    });

    const skills = await Skill.findAll({
      include: [Category],
      order: [['name', 'ASC']]
    });

    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    res.render('profile/index', {
      title: 'My Profile - SkillSwap MY',
      user,
      skills,
      categories
    });
  } catch (error) {
    console.error('Profile error:', error);
    req.session.error = 'Error loading profile.';
    res.redirect('/');
  }
});

// Update profile
router.post('/update', validate(schemas.profile), async (req, res) => {
  try {
    const { name, bio, location, isPublic } = req.body;
    
    await req.user.update({
      name,
      bio: bio || '',
      location: location || '',
      isPublic: isPublic === 'true'
    });

    req.session.success = 'Profile updated successfully.';
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.session.error = 'Error updating profile.';
    res.redirect('/profile');
  }
});

// Add skill
router.post('/skills', async (req, res) => {
  try {
    const { skillId, type, level } = req.body;

    // Check if skill already exists for user
    const existingSkill = await UserSkill.findOne({
      where: {
        userId: req.user.id,
        skillId,
        type
      }
    });

    if (existingSkill) {
      req.session.error = 'Skill already exists for this type.';
      return res.redirect('/profile');
    }

    await UserSkill.create({
      userId: req.user.id,
      skillId,
      type,
      level
    });

    req.session.success = 'Skill added successfully.';
    res.redirect('/profile');
  } catch (error) {
    console.error('Add skill error:', error);
    req.session.error = 'Error adding skill.';
    res.redirect('/profile');
  }
});

// Remove skill
router.delete('/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const userSkill = await UserSkill.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!userSkill) {
      return res.status(404).json({ error: 'Skill not found.' });
    }

    await userSkill.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Remove skill error:', error);
    res.status(500).json({ error: 'Error removing skill.' });
  }
});

// Add availability
router.post('/availability', async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;

    // Validate time format
    if (!startTime || !endTime) {
      req.session.error = 'Please provide start and end times.';
      return res.redirect('/profile');
    }

    if (startTime >= endTime) {
      req.session.error = 'End time must be after start time.';
      return res.redirect('/profile');
    }

    await Availability.create({
      userId: req.user.id,
      dayOfWeek: parseInt(dayOfWeek),
      startTime,
      endTime
    });

    req.session.success = 'Availability added successfully.';
    res.redirect('/profile');
  } catch (error) {
    console.error('Add availability error:', error);
    req.session.error = 'Error adding availability.';
    res.redirect('/profile');
  }
});

// Remove availability
router.delete('/availability/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const availability = await Availability.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!availability) {
      return res.status(404).json({ error: 'Availability not found.' });
    }

    await availability.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Remove availability error:', error);
    res.status(500).json({ error: 'Error removing availability.' });
  }
});

// Toggle privacy
router.post('/privacy', async (req, res) => {
  try {
    await req.user.update({
      isPublic: !req.user.isPublic
    });

    req.session.success = `Profile is now ${req.user.isPublic ? 'public' : 'private'}.`;
    res.redirect('/profile');
  } catch (error) {
    console.error('Privacy toggle error:', error);
    req.session.error = 'Error updating privacy settings.';
    res.redirect('/profile');
  }
});

module.exports = router; 