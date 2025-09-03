const express = require('express');
const { LearningSession, User, Skill, Rating } = require('../models');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// My sessions page
router.get('/', async (req, res) => {
  try {
    const teachingSessions = await LearningSession.findAll({
      where: { teacherId: req.user.id },
      include: [
        { model: User, as: 'learner', attributes: ['id', 'name'] },
        { model: Skill, attributes: ['id', 'name'] }
      ],
      order: [['startAt', 'DESC']]
    });

    const learningSessions = await LearningSession.findAll({
      where: { learnerId: req.user.id },
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name'] },
        { model: Skill, attributes: ['id', 'name'] }
      ],
      order: [['startAt', 'DESC']]
    });

    res.render('sessions/index', {
      title: 'My Sessions - SkillSwap MY',
      teachingSessions,
      learningSessions
    });
  } catch (error) {
    console.error('Sessions error:', error);
    req.session.error = 'Error loading sessions.';
    res.redirect('/');
  }
});

// Request session
router.post('/request', validate(schemas.session), async (req, res) => {
  try {
    const { skillId, teacherId, startAt, endAt } = req.body;

    // Check if teacher exists and has this skill
    const teacher = await User.findByPk(teacherId);
    if (!teacher) {
      req.session.error = 'Teacher not found.';
      return res.redirect('back');
    }

    // Create session
    await LearningSession.create({
      teacherId: parseInt(teacherId),
      learnerId: req.user.id,
      skillId: parseInt(skillId),
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: 'requested'
    });

    req.session.success = 'Session request sent successfully.';
    res.redirect('/sessions');
  } catch (error) {
    console.error('Request session error:', error);
    req.session.error = 'Error requesting session.';
    res.redirect('back');
  }
});

// Confirm session
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await LearningSession.findByPk(id);
    
    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }

    if (session.teacherId !== req.user.id) {
      req.session.error = 'You can only confirm sessions you are teaching.';
      return res.redirect('/sessions');
    }

    if (session.status !== 'requested') {
      req.session.error = 'Session cannot be confirmed.';
      return res.redirect('/sessions');
    }

    await session.update({ status: 'confirmed' });

    req.session.success = 'Session confirmed successfully.';
    res.redirect('/sessions');
  } catch (error) {
    console.error('Confirm session error:', error);
    req.session.error = 'Error confirming session.';
    res.redirect('/sessions');
  }
});

// Complete session
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await LearningSession.findByPk(id);
    
    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }

    if (session.teacherId !== req.user.id && session.learnerId !== req.user.id) {
      req.session.error = 'You can only complete sessions you are part of.';
      return res.redirect('/sessions');
    }

    if (session.status !== 'confirmed') {
      req.session.error = 'Session cannot be completed.';
      return res.redirect('/sessions');
    }

    await session.update({ status: 'completed' });

    req.session.success = 'Session completed successfully.';
    res.redirect('/sessions');
  } catch (error) {
    console.error('Complete session error:', error);
    req.session.error = 'Error completing session.';
    res.redirect('/sessions');
  }
});

// Cancel session
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await LearningSession.findByPk(id);
    
    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }

    if (session.teacherId !== req.user.id && session.learnerId !== req.user.id) {
      req.session.error = 'You can only cancel sessions you are part of.';
      return res.redirect('/sessions');
    }

    if (session.status === 'completed') {
      req.session.error = 'Completed sessions cannot be cancelled.';
      return res.redirect('/sessions');
    }

    await session.update({ status: 'cancelled' });

    req.session.success = 'Session cancelled successfully.';
    res.redirect('/sessions');
  } catch (error) {
    console.error('Cancel session error:', error);
    req.session.error = 'Error cancelling session.';
    res.redirect('/sessions');
  }
});

// View session detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await LearningSession.findByPk(id, {
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name'] },
        { model: User, as: 'learner', attributes: ['id', 'name'] },
        { model: Skill, attributes: ['id', 'name'] },
        {
          model: Rating,
          as: 'ratings',
          include: [
            { model: User, as: 'rater', attributes: ['id', 'name'] },
            { model: User, as: 'ratee', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }

    if (session.teacherId !== req.user.id && session.learnerId !== req.user.id) {
      req.session.error = 'Access denied.';
      return res.redirect('/sessions');
    }

    res.render('sessions/detail', {
      title: 'Session Detail - SkillSwap MY',
      session
    });
  } catch (error) {
    console.error('Session detail error:', error);
    req.session.error = 'Error loading session.';
    res.redirect('/sessions');
  }
});

module.exports = router; 