const express = require('express');
const { User, UserSkill, Availability, Skill, Category, UserProgress, TipToken } = require('../models');
const { validate, schemas } = require('../middlewares/validate');
const multer = require('multer');
const path = require('path');

// Configure Multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/avatars');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

const router = express.Router();
// Export progress CSV
router.get('/progress/export', async (req, res) => {
  try {
    const rows = await UserProgress.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="progress.csv"');
    const header = 'date,type,sessionId,points\n';
    const lines = rows.map(r => [
      new Date(r.createdAt).toISOString(),
      r.type,
      r.sessionId,
      r.points
    ].join(','));
    res.send(header + lines.join('\n'));
  } catch (error) {
    console.error('Progress export error:', error);
    req.session.error = 'Error exporting progress.';
    res.redirect('/profile');
  }
});

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

    // Compute progress summary and badges
    const progress = await UserProgress.findAll({ where: { userId: req.user.id } });
    const totalPoints = progress.reduce((sum, p) => sum + (p.points || 0), 0);
    const learnPoints = progress.filter(p => p.type === 'learn').reduce((s, p) => s + p.points, 0);
    const teachPoints = progress.filter(p => p.type === 'teach').reduce((s, p) => s + p.points, 0);
    const badges = [];
    // thresholds
    if (totalPoints >= 50) badges.push({ label: 'Rising Star', class: 'bg-info text-dark' });
    if (totalPoints >= 150) badges.push({ label: 'Skilled', class: 'bg-primary' });
    if (totalPoints >= 300) badges.push({ label: 'Expert', class: 'bg-success' });
    if (teachPoints >= 100) badges.push({ label: 'Mentor', class: 'bg-warning text-dark' });
    if (learnPoints >= 100) badges.push({ label: 'Dedicated Learner', class: 'bg-secondary' });

    // Wallet data - tips received
    const tipsReceived = await TipToken.findAll({
      where: { toUserId: req.user.id },
      include: [{ model: User, as: 'fromUser', attributes: ['id', 'name', 'profileImage'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    const totalTipsReceived = await TipToken.count({ where: { toUserId: req.user.id } });
    const totalTipsAmount = await TipToken.sum('amount', { where: { toUserId: req.user.id } }) || 0;

    res.render('profile/index', {
      title: 'My Profile - SkillSwap MY',
      user,
      skills,
      categories,
      progressSummary: { totalPoints, learnPoints, teachPoints, badges },
      wallet: { tipsReceived, totalTipsReceived, totalTipsAmount }
    });
  } catch (error) {
    console.error('Profile error:', error);
    req.session.error = 'Error loading profile.';
    res.redirect('/');
  }
});

// Update profile
router.post('/update', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, bio, location, isPublic, whatsappNumber } = req.body;

    const updateData = {
      name,
      bio: bio || '',
      location: location || '',
      whatsappNumber: whatsappNumber || null,
      isPublic: isPublic === 'true'
    };

    if (req.file) {
      updateData.profileImage = '/uploads/avatars/' + req.file.filename;
    }

    await req.user.update(updateData);

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