const express = require('express');
const { TipToken, User } = require('../models');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// Basic in-memory rate limit: key by ip+user, max 10 tips / 10 minutes
const tipRateStore = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TIPS = 10;

function isRateLimited(req) {
  const key = `${req.ip}:${req.user?.id || 'anon'}`;
  const now = Date.now();
  const entry = tipRateStore.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }
  entry.count += 1;
  tipRateStore.set(key, entry);
  return entry.count > MAX_TIPS;
}

// GET /tips - history
router.get('/', async (req, res) => {
  try {
    const received = await TipToken.findAll({
      where: { toUserId: req.user.id },
      include: [{ model: User, as: 'fromUser', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    const sent = await TipToken.findAll({
      where: { fromUserId: req.user.id },
      include: [{ model: User, as: 'toUser', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.render('tips/index', {
      title: 'My Tips - SkillSwap MY',
      received,
      sent
    });
  } catch (error) {
    console.error('Tips history error:', error);
    req.session.error = 'Error loading tips.';
    res.redirect('/profile');
  }
});

// POST /tips/send - send a tip
router.post('/send', validate(schemas.tip), async (req, res) => {
  try {
    if (isRateLimited(req)) {
      req.session.error = 'Too many tips sent. Please try again later.';
      return res.redirect('back');
    }

    const { toUserId, amount, note } = req.body;
    const toId = parseInt(toUserId);
    if (!Number.isInteger(toId)) {
      req.session.error = 'Invalid recipient.';
      return res.redirect('back');
    }
    if (toId === req.user.id) {
      req.session.error = 'You cannot tip yourself.';
      return res.redirect('back');
    }

    const recipient = await User.findByPk(toId);
    if (!recipient) {
      req.session.error = 'Recipient not found.';
      return res.redirect('back');
    }

    const amt = parseInt(amount);
    if (!Number.isFinite(amt) || amt < 1 || amt > 10) {
      req.session.error = 'Tip amount must be between 1 and 10.';
      return res.redirect('back');
    }

    await TipToken.create({
      fromUserId: req.user.id,
      toUserId: toId,
      amount: amt,
      note: note || ''
    });

    req.session.success = 'Tip sent!';
    res.redirect('back');
  } catch (error) {
    console.error('Send tip error:', error);
    req.session.error = 'Error sending tip.';
    res.redirect('back');
  }
});

module.exports = router;


