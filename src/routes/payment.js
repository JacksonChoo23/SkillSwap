// src/routes/payment.js
'use strict';

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const { Transaction, Invoice, User, sequelize } = require('../models');
const stripe = require('../config/stripe');

// Helper: Generate Invoice Number
function generateInvoiceNumber() {
    const prefix = 'INV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Helper: Get or Create Stripe Customer
async function getOrCreateStripeCustomer(user) {
    if (user.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
            userId: user.id
        }
    });

    user.stripeCustomerId = customer.id;
    await user.save();
    return customer.id;
}

// ==================== USER ROUTES ====================

// GET /payment - Payment history page
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const transactions = await Transaction.findAll({
            where: { userId: req.user.id },
            include: [{ model: Invoice, as: 'invoice' }],
            order: [['createdAt', 'DESC']]
        });

        res.render('payment/history', {
            title: 'Payment History',
            transactions
        });
    } catch (error) {
        next(error);
    }
});

// GET /payment/methods - Manage Payment Methods
router.get('/methods', isAuthenticated, async (req, res, next) => {
    try {
        const stripeCustomerId = await getOrCreateStripeCustomer(req.user);

        // List payment methods
        const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'card',
        });

        res.render('payment/methods', {
            title: 'Payment Methods',
            paymentMethods: paymentMethods.data,
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });
    } catch (error) {
        next(error);
    }
});

// GET /payment/checkout - Checkout page
router.get('/checkout', isAuthenticated, async (req, res, next) => {
    try {
        const { amount, description } = req.query;
        // Ensure customer exists
        await getOrCreateStripeCustomer(req.user);

        // We don't create the PaymentIntent here immediately because 
        // we might want to let the user choose a saved card first.
        // However, for Stripe Elements with "Payment Element", usually you create PI first.
        // Or if we use "Setup Intent" mode first for saving cards.

        // For this flow, we will create a PaymentIntent on the page load 
        // if we are strictly doing a one-off payment, 
        // OR we can do it via AJAX when the user confirms.
        // Let's pass the key and letting the frontend handle the PI creation via AJAX is better for dynamic amounts.

        res.render('payment/checkout', {
            title: 'Checkout',
            amount: amount || '',
            description: description || 'SkillSwap Payment',
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
        });
    } catch (error) {
        next(error);
    }
});

// POST /payment/create-payment-intent
router.post('/create-payment-intent', isAuthenticated, async (req, res) => {
    try {
        const { amount, description, paymentMethodId, saveCard } = req.body;
        const stripeCustomerId = await getOrCreateStripeCustomer(req.user);

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Amount in cents
        const amountInCents = Math.round(parseFloat(amount) * 100);

        const paymentIntentData = {
            amount: amountInCents,
            currency: 'myr',
            customer: stripeCustomerId,
            description: description || 'SkillSwap Payment',
            metadata: {
                userId: req.user.id,
                description: description || 'SkillSwap Payment'
            },
            automatic_payment_methods: {
                enabled: true,
            },
        };

        // If using a saved payment method
        if (paymentMethodId) {
            paymentIntentData.payment_method = paymentMethodId;
            paymentIntentData.off_session = true; // For potential future off-session usage if saved
            paymentIntentData.confirm = true; // Confirm immediately
            paymentIntentData.return_url = `${process.env.APP_URL}/payment`; // Required for some flows
        }

        // If saving card (SetupFutureUsage)
        if (saveCard && !paymentMethodId) {
            paymentIntentData.setup_future_usage = 'off_session';
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

        // Respond with client secret
        res.json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });

    } catch (error) {
        console.error('Create PaymentIntent Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /payment/create-setup-intent (For saving cards without payment)
router.post('/create-setup-intent', isAuthenticated, async (req, res) => {
    try {
        const stripeCustomerId = await getOrCreateStripeCustomer(req.user);

        const setupIntent = await stripe.setupIntents.create({
            customer: stripeCustomerId,
            automatic_payment_methods: { enabled: true },
        });

        res.json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
        console.error('Create SetupIntent Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /payment/delete-method
router.post('/delete-method', isAuthenticated, async (req, res) => {
    try {
        const { paymentMethodId } = req.body;
        // Ideally verify ownership first, but Stripe ensures customer matching if we attached it to this customer?
        // Actually, you can detach.

        await stripe.paymentMethods.detach(paymentMethodId);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==================== WEBHOOK ====================
// Webhook events are now handled in src/routes/webhook.js
// mapped to /webhook in app.js

// GET /payment/api/methods - API to get payment methods as JSON
router.get('/api/methods', isAuthenticated, async (req, res) => {
    try {
        if (!req.user.stripeCustomerId) {
            return res.json({ paymentMethods: [] });
        }

        const paymentMethods = await stripe.paymentMethods.list({
            customer: req.user.stripeCustomerId,
            type: 'card',
        });

        res.json({
            paymentMethods: paymentMethods.data.map(pm => ({
                id: pm.id,
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year
            }))
        });
    } catch (error) {
        console.error('API get methods error:', error);
        res.json({ paymentMethods: [] });
    }
});

// GET /payment/invoice/:id - View invoice
router.get('/invoice/:id', isAuthenticated, async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({
            where: { id: req.params.id },
            include: [{
                model: Transaction,
                as: 'transaction',
                where: { userId: req.user.id },
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
            }]
        });

        if (!invoice) {
            req.flash('error', 'Invoice not found');
            return res.redirect('/payment');
        }

        res.render('payment/invoice', {
            title: `Invoice ${invoice.invoiceNumber}`,
            invoice,
            transaction: invoice.transaction,
            user: invoice.transaction.user
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
