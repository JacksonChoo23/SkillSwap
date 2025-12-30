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

// Export comprehensive resume-friendly CSV
router.get('/progress/export', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    // Get user's skills
    const userSkills = await UserSkill.findAll({
      where: { userId },
      include: [{ model: Skill, include: [Category] }]
    });

    // Get completed sessions (both as teacher and student)
    const { LearningSession, Rating } = require('../models');
    const { Op } = require('sequelize');

    const sessions = await LearningSession.findAll({
      where: {
        [Op.or]: [{ teacherId: userId }, { studentId: userId }],
        status: 'completed'
      },
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name'] },
        { model: User, as: 'student', attributes: ['id', 'name'] },
        { model: Skill, attributes: ['id', 'name'] }
      ],
      order: [['actualEndAt', 'DESC']]
    });

    // Get ratings received
    const ratings = await Rating.findAll({
      where: { rateeId: userId },
      include: [
        { model: User, as: 'rater', attributes: ['name'] },
        { model: LearningSession, include: [{ model: Skill, attributes: ['name'] }] }
      ]
    });

    // Calculate statistics
    const progress = await UserProgress.findAll({ where: { userId } });
    const totalPoints = progress.reduce((sum, p) => sum + (p.points || 0), 0);
    const learnPoints = progress.filter(p => p.type === 'learn').reduce((s, p) => s + p.points, 0);
    const teachPoints = progress.filter(p => p.type === 'teach').reduce((s, p) => s + p.points, 0);

    // Calculate total hours from sessions
    let totalTeachHours = 0;
    let totalLearnHours = 0;
    sessions.forEach(s => {
      const hours = (s.actualEndAt && s.actualStartAt)
        ? (new Date(s.actualEndAt) - new Date(s.actualStartAt)) / (1000 * 60 * 60)
        : 0;
      if (s.teacherId === userId) totalTeachHours += hours;
      else totalLearnHours += hours;
    });

    // Calculate average rating
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 'N/A';

    // Determine achievements
    const achievements = [];
    if (totalPoints >= 50) achievements.push('Rising Star');
    if (totalPoints >= 150) achievements.push('Skilled');
    if (totalPoints >= 300) achievements.push('Expert');
    if (teachPoints >= 100) achievements.push('Mentor');
    if (learnPoints >= 100) achievements.push('Dedicated Learner');
    if (sessions.length >= 10) achievements.push('Active Participant');
    if (ratings.length >= 5 && parseFloat(avgRating) >= 4.5) achievements.push('Highly Rated');

    // Build CSV content
    let csv = '';

    // Section 1: Profile Summary
    csv += '=== SKILLSWAP MY - SKILL EXCHANGE PORTFOLIO ===\n';
    csv += `Generated on,${new Date().toLocaleDateString()}\n`;
    csv += `Name,${user.name}\n`;
    csv += `Location,${user.location || 'Not specified'}\n\n`;

    // Section 2: Statistics Summary
    csv += '=== SUMMARY STATISTICS ===\n';
    csv += `Total Points Earned,${totalPoints}\n`;
    csv += `Teaching Points,${teachPoints}\n`;
    csv += `Learning Points,${learnPoints}\n`;
    csv += `Total Teaching Hours,${totalTeachHours.toFixed(1)}\n`;
    csv += `Total Learning Hours,${totalLearnHours.toFixed(1)}\n`;
    csv += `Completed Sessions,${sessions.length}\n`;
    csv += `Average Rating Received,${avgRating}\n`;
    csv += `Achievements,${achievements.length > 0 ? achievements.join('; ') : 'None yet'}\n\n`;

    // Section 3: Skills
    csv += '=== SKILLS ===\n';
    csv += 'Skill Name,Category,Type,Proficiency Level\n';
    userSkills.forEach(us => {
      const skillName = us.Skill?.name || 'Unknown';
      const category = us.Skill?.Category?.name || 'General';
      const type = us.type === 'teach' ? 'Can Teach' : 'Learning';
      const level = us.level ? us.level.charAt(0).toUpperCase() + us.level.slice(1) : 'Not specified';
      csv += `${skillName},${category},${type},${level}\n`;
    });
    csv += '\n';

    // Section 4: Session History
    csv += '=== COMPLETED SESSIONS ===\n';
    csv += 'Date,Skill,Role,Partner,Duration (hours)\n';
    sessions.forEach(s => {
      const date = s.actualEndAt ? new Date(s.actualEndAt).toLocaleDateString() : 'N/A';
      const skill = s.Skill?.name || 'Unknown';
      const role = s.teacherId === userId ? 'Teacher' : 'Student';
      const partner = s.teacherId === userId ? s.student?.name : s.teacher?.name;
      const hours = (s.actualEndAt && s.actualStartAt)
        ? ((new Date(s.actualEndAt) - new Date(s.actualStartAt)) / (1000 * 60 * 60)).toFixed(1)
        : 'N/A';
      csv += `${date},${skill},${role},${partner || 'Unknown'},${hours}\n`;
    });
    csv += '\n';

    // Section 5: Ratings Received
    csv += '=== RATINGS & FEEDBACK ===\n';
    csv += 'Date,Skill,Rating (out of 5),From\n';
    ratings.forEach(r => {
      const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A';
      const skill = r.LearningSession?.Skill?.name || 'General';
      const rating = r.rating;
      const from = r.rater?.name || 'Anonymous';
      csv += `${date},${skill},${rating},${from}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="SkillSwap_Portfolio_${user.name.replace(/\s+/g, '_')}.csv"`);
    res.send(csv);
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
    const wantsPublic = isPublic === 'true';

    // If user wants to make profile public, check if profile is complete
    if (wantsPublic) {
      const userSkills = await UserSkill.findAll({ where: { userId: req.user.id } });
      const hasBio = bio && bio.trim().length > 0;
      const hasSkills = userSkills && userSkills.length > 0;

      if (!hasBio || !hasSkills) {
        const missing = [];
        if (!hasBio) missing.push('a bio');
        if (!hasSkills) missing.push('at least one skill');

        req.flash('error', `Please complete your profile before making it public. You need to add ${missing.join(' and ')}.`);
        return res.redirect('/profile');
      }
    }

    const updateData = {
      name,
      bio: bio || '',
      location: location || '',
      whatsappNumber: whatsappNumber || null,
      isPublic: wantsPublic
    };

    if (req.file) {
      updateData.profileImage = '/uploads/avatars/' + req.file.filename;
    }

    await req.user.update(updateData);

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error', 'Error updating profile.');
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
    const wantsPublic = !req.user.isPublic;

    // If user wants to make profile public, check if profile is complete
    if (wantsPublic) {
      const userSkills = await UserSkill.findAll({ where: { userId: req.user.id } });
      const hasBio = req.user.bio && req.user.bio.trim().length > 0;
      const hasSkills = userSkills && userSkills.length > 0;

      if (!hasBio || !hasSkills) {
        const missing = [];
        if (!hasBio) missing.push('a bio');
        if (!hasSkills) missing.push('at least one skill');

        req.flash('error', `Please complete your profile before making it public. You need to add ${missing.join(' and ')}.`);
        return res.redirect('/profile');
      }
    }

    await req.user.update({ isPublic: wantsPublic });

    req.flash('success', `Profile is now ${wantsPublic ? 'public' : 'private'}.`);
    res.redirect('/profile');
  } catch (error) {
    console.error('Privacy toggle error:', error);
    req.flash('error', 'Error updating privacy settings.');
    res.redirect('/profile');
  }
});

module.exports = router;