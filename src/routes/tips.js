const express = require('express');
const { User, Notification, Transaction, Invoice, sequelize } = require('../models');
const { Op } = require('sequelize');
const { validate, schemas } = require('../middlewares/validate');
const stripe = require('../config/stripe');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

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

// GET /tips - history (Stripe tips only)
router.get('/', async (req, res) => {
  try {
    // Query Transaction table for received tips
    const received = await Transaction.findAll({
      where: {
        recipientUserId: req.user.id,
        type: 'tip',
        status: { [Op.in]: ['succeeded', 'refunded'] }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Query Transaction table for sent tips
    const sent = await Transaction.findAll({
      where: {
        userId: req.user.id,
        type: 'tip',
        status: { [Op.in]: ['succeeded', 'refunded'] }
      },
      order: [['createdAt', 'DESC']]
    });

    // Fetch recipient details for sent tips
    const sentWithRecipients = await Promise.all(
      sent.map(async (tip) => {
        const recipientUser = await User.findByPk(tip.recipientUserId, {
          attributes: ['id', 'name']
        });
        return {
          id: tip.id,
          amount: tip.amount,
          toUser: recipientUser,
          note: tip.description || '',
          status: tip.status,
          createdAt: tip.createdAt
        };
      })
    );

    // Format received tips
    const receivedFormatted = received.map(tip => ({
      id: tip.id,
      amount: tip.amount,
      fromUser: tip.user,
      note: tip.description || '',
      status: tip.status,
      createdAt: tip.createdAt
    }));

    res.render('tips/index', {
      title: 'My Tips - SkillSwap MY',
      received: receivedFormatted,
      sent: sentWithRecipients,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Tips history error:', error);
    req.flash('error', 'Error loading tips.');
    res.redirect('/profile');
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
      // Tip record will be created by webhook handler in Transaction table

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
