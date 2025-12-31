const express = require('express');
const { TipToken, User, Notification, Transaction, Invoice, sequelize } = require('../models');
const { validate, schemas } = require('../middlewares/validate');
const stripe = require('../config/stripe');
const { createNotification } = require('../services/notificationService');

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

// Helper: Get or Create Stripe Customer
async function getOrCreateStripeCustomer(user) {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id }
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

// Helper: Generate Invoice Number
function generateInvoiceNumber() {
  const prefix = 'TIP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
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
      sent,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Tips history error:', error);
    req.flash('error', 'Error loading tips.');
    res.redirect('/profile');
  }
});

// POST /tips/send - send a token tip (existing functionality)
router.post('/send', validate(schemas.tip), async (req, res) => {
  try {
    if (isRateLimited(req)) {
      req.flash('error', 'Too many tips sent. Please try again later.');
      return res.redirect('back');
    }

    const { toUserId, amount, note } = req.body;
    const toId = parseInt(toUserId);
    if (!Number.isInteger(toId)) {
      req.flash('error', 'Invalid recipient.');
      return res.redirect('back');
    }
    if (toId === req.user.id) {
      req.flash('error', 'You cannot tip yourself.');
      return res.redirect('back');
    }

    const recipient = await User.findByPk(toId);
    if (!recipient) {
      req.flash('error', 'Recipient not found.');
      return res.redirect('back');
    }

    const amt = parseInt(amount);
    if (!Number.isFinite(amt) || amt < 1 || amt > 10) {
      req.flash('error', 'Tip amount must be between 1 and 10.');
      return res.redirect('back');
    }

    await TipToken.create({
      fromUserId: req.user.id,
      toUserId: toId,
      amount: amt,
      note: note || ''
    });

    // Notify recipient
    await createNotification({
      userId: toId,
      title: 'Tip Received!',
      message: `You received a tip of ${amt} tokens from ${req.user.name || 'a user'}! ${note ? `Note: ${note}` : ''}`
    });

    req.flash('success', 'Tip sent successfully!');
    res.redirect('back');
  } catch (error) {
    console.error('Send tip error:', error);
    req.flash('error', 'Error sending tip. Please try again.');
    res.redirect('back');
  }
});

// POST /tips/create-payment-intent - Create a PaymentIntent for a real money tip
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { toUserId, amount, note } = req.body;
    const toId = parseInt(toUserId);

    if (!Number.isInteger(toId) || toId === req.user.id) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    const recipient = await User.findByPk(toId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const amt = parseFloat(amount);
    if (!amt || amt < 1 || amt > 500) {
      return res.status(400).json({ error: 'Tip amount must be between RM1 and RM500' });
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(req.user);
    const amountInCents = Math.round(amt * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'myr',
      customer: stripeCustomerId,
      description: `Tip to ${recipient.name}`,
      metadata: {
        type: 'tip',
        fromUserId: req.user.id,
        toUserId: toId,
        note: note || '',
        recipientName: recipient.name
      },
      automatic_payment_methods: { enabled: true }
    });

    res.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
  } catch (error) {
    console.error('Create tip PaymentIntent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /tips/send/:userId - Page to send a tip to a specific user
router.get('/send/:userId', async (req, res) => {
  try {
    const recipient = await User.findByPk(req.params.userId, {
      attributes: ['id', 'name', 'profileImage']
    });

    if (!recipient) {
      req.flash('error', 'User not found');
      return res.redirect('/browse');
    }

    if (recipient.id === req.user.id) {
      req.flash('error', 'You cannot tip yourself');
      return res.redirect('/profile');
    }

    // Get saved payment methods for quick pay
    let savedCards = [];
    if (req.user.stripeCustomerId) {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: req.user.stripeCustomerId,
          type: 'card'
        });
        savedCards = paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        }));
      } catch (err) {
        console.error('Error fetching saved cards:', err);
      }
    }

    res.render('tips/send', {
      title: `Send Tip to ${recipient.name}`,
      recipient,
      savedCards,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Load tip page error:', error);
    req.flash('error', 'Error loading page');
    res.redirect('/browse');
  }
});

// POST /tips/quick-pay - Quick pay using saved payment method
router.post('/quick-pay', async (req, res) => {
  try {
    if (isRateLimited(req)) {
      return res.status(429).json({ error: 'Too many tips sent. Please try again later.' });
    }

    const { toUserId, amount, note, paymentMethodId } = req.body;
    const toId = parseInt(toUserId);

    if (!Number.isInteger(toId) || toId === req.user.id) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'No payment method selected' });
    }

    const recipient = await User.findByPk(toId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const amt = parseFloat(amount);
    if (!amt || amt < 1 || amt > 500) {
      return res.status(400).json({ error: 'Tip amount must be between RM1 and RM500' });
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(req.user);
    const amountInCents = Math.round(amt * 100);

    // Create and immediately confirm payment intent with saved card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'myr',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: `Tip to ${recipient.name}`,
      metadata: {
        type: 'tip',
        fromUserId: req.user.id,
        toUserId: toId,
        note: note || '',
        recipientName: recipient.name
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // Create tip record
      await TipToken.create({
        fromUserId: req.user.id,
        toUserId: toId,
        amount: amt,
        note: note || '',
        paymentIntentId: paymentIntent.id
      });

      // Notify recipient
      await createNotification({
        userId: toId,
        title: 'Tip Received!',
        message: `You received a tip of RM${amt} from ${req.user.name || 'a user'}! ${note ? `Note: ${note}` : ''}`
      });

      res.json({ success: true, message: 'Tip sent successfully!' });
    } else {
      res.status(400).json({ error: 'Payment failed. Please try again.' });
    }
  } catch (error) {
    console.error('Quick pay error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Payment failed. Please try again.' });
  }
});

// GET /tips/saved-cards - Get saved payment methods for current user
router.get('/saved-cards', async (req, res) => {
  try {
    if (!req.user.stripeCustomerId) {
      return res.json({ cards: [] });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: req.user.stripeCustomerId,
      type: 'card'
    });

    const cards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year
    }));

    res.json({ cards });
  } catch (error) {
    console.error('Error fetching saved cards:', error);
    res.status(500).json({ error: 'Failed to load saved cards' });
  }
});

module.exports = router;



