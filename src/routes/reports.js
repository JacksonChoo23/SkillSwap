const express = require('express');
const { Report, User } = require('../models');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// POST /reports - submit a report
router.post('/', validate(schemas.report), async (req, res) => {
  try {
    const { targetUserId, reason, listingId, sessionId, messageThreadId } = req.body;
    const targetId = parseInt(targetUserId);
    if (!Number.isInteger(targetId)) {
      req.session.error = 'Invalid target user.';
      return res.redirect('back');
    }
    if (targetId === req.user.id) {
      req.session.error = 'You cannot report yourself.';
      return res.redirect('back');
    }

    const target = await User.findByPk(targetId);
    if (!target) {
      req.session.error = 'Target user not found.';
      return res.redirect('back');
    }

    await Report.create({
      reporterId: req.user.id,
      targetUserId: targetId,
      reason: reason.trim(),
      listingId: listingId ? parseInt(listingId) : null,
      sessionId: sessionId ? parseInt(sessionId) : null,
      messageThreadId: messageThreadId ? parseInt(messageThreadId) : null,
      status: 'open'
    });

    req.session.success = 'Report submitted. Our team will review it shortly.';
    res.redirect('back');
  } catch (error) {
    console.error('Report submission error:', error);
    req.session.error = 'Error submitting report.';
    res.redirect('back');
  }
});

module.exports = router;


