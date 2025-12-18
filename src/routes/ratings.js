const express = require('express');
const { Rating, LearningSession, User, Notification } = require('../models');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// Rate session
router.post('/:sessionId', validate(schemas.rating), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rateeId, communication, skill, attitude, punctuality, comment } = req.body;

    console.log(`[Rating] Submitting rating for session ${sessionId} by user ${req.user.id} to ${rateeId}`);

    const session = await LearningSession.findByPk(sessionId);

    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }

    // Check if user is part of this session
    if (session.teacherId !== req.user.id && session.studentId !== req.user.id) {
      req.session.error = 'You can only rate sessions you are part of.';
      return res.redirect('/sessions');
    }

    // Check if session is completed
    if (session.status !== 'completed') {
      req.session.error = 'You can only rate completed sessions.';
      return res.redirect('/sessions');
    }

    // Check if user is rating the other participant
    if (parseInt(rateeId) !== session.teacherId && parseInt(rateeId) !== session.studentId) {
      req.session.error = 'Invalid rating target.';
      return res.redirect('/sessions');
    }

    if (parseInt(rateeId) === req.user.id) {
      req.session.error = 'You cannot rate yourself.';
      return res.redirect('/sessions');
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      where: {
        sessionId,
        raterId: req.user.id,
        rateeId: parseInt(rateeId)
      }
    });

    if (existingRating) {
      req.session.error = 'You have already rated this user for this session.';
      return res.redirect('/sessions');
    }

    // Create rating
    await Rating.create({
      sessionId,
      raterId: req.user.id,
      rateeId: parseInt(rateeId),
      communication: parseInt(communication),
      skill: parseInt(skill),
      attitude: parseInt(attitude),
      punctuality: parseInt(punctuality),
      comment: comment || ''
    });

    // Notify the user who was rated
    // Fire and forget (or use setImmediate if strictly backgrounding)
    (async () => {
      try {
        await Notification.create({
          user_id: parseInt(rateeId),
          title: 'New Rating Received',
          message: `You received a new rating from ${req.user.name} for the session on ${session.Skill ? session.Skill.name : 'your skill'}.`,
          status: 'unread'
        });
      } catch (e) {
        console.error('Failed to create rating notification:', e);
      }
    })();

    req.session.success = 'Rating submitted successfully.';
    res.redirect(`/sessions/${sessionId}`);
  } catch (error) {
    console.error('Rating error:', error);
    req.session.error = 'Error submitting rating.';
    res.redirect('/sessions');
  }
});

module.exports = router; 