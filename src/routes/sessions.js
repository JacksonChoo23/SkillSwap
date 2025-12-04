const express = require('express');
const { LearningSession, User, Skill, Rating, UserProgress, Notification, Availability } = require('../models');
const { Op } = require('sequelize');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// My sessions page
router.get('/', async (req, res) => {
  try {
    const teachingSessions = await LearningSession.findAll({
      where: { teacherId: req.user.id },
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'whatsapp_number'] },
        { model: Skill, attributes: ['id', 'name'] }
      ],
      order: [['startAt', 'DESC']]
    });

    const learningSessions = await LearningSession.findAll({
      where: { studentId: req.user.id },
      include: [
        { model: User, as: 'teacher', attributes: ['id', 'name', 'whatsapp_number'] },
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
    const requestStart = new Date(startAt);
    const requestEnd = new Date(endAt);

    // Basic validation
    if (requestStart >= requestEnd) {
      req.session.error = 'End time must be after start time.';
      return res.redirect(req.get('Referrer') || '/sessions');
    }
    if (requestStart < new Date()) {
      req.session.error = 'Cannot book sessions in the past.';
      return res.redirect(req.get('Referrer') || '/sessions');
    }

    // Check if teacher exists
    const teacher = await User.findByPk(teacherId);
    if (!teacher) {
      req.session.error = 'Teacher not found.';
      return res.redirect(req.get('Referrer') || '/sessions');
    }

    // 1. Check Availability
    const dayOfWeek = requestStart.getDay();
    const startTimeStr = requestStart.toTimeString().split(' ')[0];
    const endTimeStr = requestEnd.toTimeString().split(' ')[0];

    const availability = await Availability.findOne({
      where: {
        userId: teacherId,
        dayOfWeek: dayOfWeek,
        startTime: { [Op.lte]: startTimeStr },
        endTime: { [Op.gte]: endTimeStr }
      }
    });

    if (!availability) {
      req.session.error = 'The teacher is not available at this time.';
      return res.redirect(req.get('Referrer') || '/sessions');
    }

    // 2. Check Conflicts
    const conflict = await LearningSession.findOne({
      where: {
        teacherId: teacherId,
        status: { [Op.in]: ['confirmed', 'requested', 'in_progress'] },
        [Op.or]: [
          {
            startAt: { [Op.lt]: requestEnd },
            endAt: { [Op.gt]: requestStart }
          }
        ]
      }
    });

    if (conflict) {
      req.session.error = 'The teacher already has a session at this time.';
      return res.redirect(req.get('Referrer') || '/sessions');
    }

    const skill = await Skill.findByPk(skillId, { attributes: ['id', 'name'] });

    // Create session
    await LearningSession.create({
      teacherId: parseInt(teacherId, 10),
      studentId: req.user.id,
      skillId: parseInt(skillId, 10),
      startAt: requestStart,
      endAt: requestEnd,
      status: 'requested'
    });

    try {
      const requesterName = req.user?.name || 'A SkillSwap member';
      const skillName = skill?.name || 'their skill';
      const timeText = startAt
        ? new Date(startAt).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
        : 'a proposed time';

      await Notification.create({
        user_id: teacher.id,
        title: 'New teaching request',
        message: `${requesterName} requested a session for ${skillName} on ${timeText}.`
      });
    } catch (notificationError) {
      console.error('Failed to create notification for teaching request:', notificationError);
    }

    req.session.success = 'Session request sent successfully.';
    res.redirect('/sessions');
  } catch (error) {
    console.error('Request session error:', error);
    req.session.error = 'Error requesting session.';
    res.redirect(req.get('Referrer') || '/sessions');
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

// Generate start code (teacher only)
router.post('/:id/generate-code', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await LearningSession.findByPk(id);
    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }
    if (session.teacherId !== req.user.id) {
      req.session.error = 'Only the teacher can generate a code.';
      return res.redirect(`/sessions/${id}`);
    }
    if (!['confirmed', 'in_progress'].includes(session.status)) {
      req.session.error = 'Session must be confirmed to generate a code.';
      return res.redirect(`/sessions/${id}`);
    }
    // 3-digit code; can switch to 4-6 if needed
    const code = String(Math.floor(100 + Math.random() * 900));
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await session.update({ startCode: code, codeExpiresAt: expires });
    req.session.success = `Start code generated. Expires at ${expires.toLocaleTimeString()}.`;
    res.redirect(`/sessions/${id}`);
  } catch (error) {
    console.error('Generate code error:', error);
    req.session.error = 'Error generating code.';
    res.redirect('/sessions');
  }
});

// Verify start code (student only)
router.post('/:id/verify-code', validate(schemas.sessionCode), async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const session = await LearningSession.findByPk(id);
    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }
    if (session.studentId !== req.user.id) {
      req.session.error = 'Only the learner can verify the code.';
      return res.redirect(`/sessions/${id}`);
    }
    if (session.status !== 'confirmed' && session.status !== 'in_progress') {
      req.session.error = 'Session is not ready to start.';
      return res.redirect(`/sessions/${id}`);
    }
    if (!session.startCode || !session.codeExpiresAt) {
      req.session.error = 'No start code generated yet.';
      return res.redirect(`/sessions/${id}`);
    }
    if (String(session.startCode) !== String(code)) {
      req.session.error = 'Invalid code.';
      return res.redirect(`/sessions/${id}`);
    }
    if (new Date(session.codeExpiresAt).getTime() < Date.now()) {
      req.session.error = 'Code expired. Ask the teacher to generate a new one.';
      return res.redirect(`/sessions/${id}`);
    }
    // Start session
    if (!session.actualStartAt) {
      await session.update({ actualStartAt: new Date(), status: 'in_progress' });
    }
    req.session.success = 'Session started.';
    res.redirect(`/sessions/${id}`);
  } catch (error) {
    console.error('Verify code error:', error);
    req.session.error = 'Error verifying code.';
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

    if (session.teacherId !== req.user.id && session.studentId !== req.user.id) {
      req.session.error = 'You can only complete sessions you are part of.';
      return res.redirect('/sessions');
    }

    if (session.status !== 'confirmed') {
      req.session.error = 'Session cannot be completed.';
      return res.redirect('/sessions');
    }

    await session.update({ status: 'completed' });

    try {
      // Compute duration in hours
      const start = session.actualStartAt ? new Date(session.actualStartAt) : new Date(session.startAt);
      const end = session.actualEndAt ? new Date(session.actualEndAt) : new Date(session.endAt);
      const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
      // Average rating if exists (from both sides)
      const ratings = await Rating.findAll({ where: { sessionId: session.id } });
      let avg = 0;
      if (ratings.length) {
        const totals = ratings.map(r => (r.communication + r.skill + r.attitude + r.punctuality) / 4);
        avg = totals.reduce((a, b) => a + b, 0) / totals.length;
      }
      const basePoints = Math.round(durationHours * 10);
      const ratingBonus = Math.round(avg * 2); // up to ~10 bonus
      const points = Math.max(1, basePoints + ratingBonus);

      // Create progress for both participants
      await UserProgress.bulkCreate([
        { userId: session.studentId, sessionId: session.id, type: 'learn', points },
        { userId: session.teacherId, sessionId: session.id, type: 'teach', points }
      ]);
    } catch (e) {
      console.error('Progress write error:', e);
    }

    req.session.success = 'Session completed successfully.';
    res.redirect('/sessions');
  } catch (error) {
    console.error('Complete session error:', error);
    req.session.error = 'Error completing session.';
    res.redirect('/sessions');
  }
});

// End session (teacher ends; records actual_end_at)
router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await LearningSession.findByPk(id);
    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }
    if (session.teacherId !== req.user.id) {
      req.session.error = 'Only the teacher can end the session.';
      return res.redirect(`/sessions/${id}`);
    }
    if (session.status !== 'in_progress') {
      req.session.error = 'Session is not in progress.';
      return res.redirect(`/sessions/${id}`);
    }
    // record actual end time and finalize the session
    await session.update({ actualEndAt: new Date(), status: 'completed' });

    // finalize progress and compute points (same logic as complete handler)
    try {
      const updated = await LearningSession.findByPk(id); // reload to get actualStartAt/End
      const start = updated.actualStartAt ? new Date(updated.actualStartAt) : new Date(updated.startAt);
      const end = updated.actualEndAt ? new Date(updated.actualEndAt) : new Date(updated.endAt);
      const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
      const ratings = await Rating.findAll({ where: { sessionId: updated.id } });
      let avg = 0;
      if (ratings.length) {
        const totals = ratings.map(r => (r.communication + r.skill + r.attitude + r.punctuality) / 4);
        avg = totals.reduce((a, b) => a + b, 0) / totals.length;
      }
      const basePoints = Math.round(durationHours * 10);
      const ratingBonus = Math.round(avg * 2);
      const points = Math.max(1, basePoints + ratingBonus);

      await UserProgress.bulkCreate([
        { userId: updated.studentId, sessionId: updated.id, type: 'learn', points },
        { userId: updated.teacherId, sessionId: updated.id, type: 'teach', points }
      ]);
    } catch (e) {
      console.error('Progress write error on end:', e);
    }

    req.session.success = 'Session ended and completed successfully.';
    return res.redirect(`/sessions/${id}`);
  } catch (error) {
    console.error('End session error:', error);
    req.session.error = 'Error ending session.';
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

    if (session.teacherId !== req.user.id && session.studentId !== req.user.id) {
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
        { model: User, as: 'teacher', attributes: ['id', 'name', 'whatsapp_number'] },
        { model: User, as: 'student', attributes: ['id', 'name', 'whatsapp_number'] },
        { model: Skill, attributes: ['id', 'name'] }
      ],
    });

    if (!session) {
      req.session.error = 'Session not found.';
      return res.redirect('/sessions');
    }

    if (session.teacherId !== req.user.id && session.studentId !== req.user.id) {
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