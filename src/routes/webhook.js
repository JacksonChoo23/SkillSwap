const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const { Transaction, Invoice, User, TipToken, Notification, sequelize } = require('../models');

// Helper: Generate Invoice Number
function generateInvoiceNumber(prefix = 'INV') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

async function handlePaymentSuccess(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    const metadata = paymentIntent.metadata || {};
    const amount = paymentIntent.amount / 100; // Convert back to main unit

    // Check if this is a tip payment
    if (metadata.type === 'tip') {
        await handleTipPayment(paymentIntent, metadata, amount);
        return;
    }

    // Regular payment handling
    const userId = metadata.userId;
    const description = metadata.description || 'SkillSwap Payment';

    const t = await sequelize.transaction();
    try {
        // Check if transaction already exists (idempotency)
        const existing = await Transaction.findOne({ where: { stripePaymentIntentId: paymentIntent.id } });
        if (existing) {
            console.log('Transaction already exists for this PaymentIntent.');
            await t.rollback();
            return;
        }

        const transaction = await Transaction.create({
            userId: userId,
            amount: amount,
            currency: 'MYR',
            status: 'succeeded',
            description: description,
            stripePaymentIntentId: paymentIntent.id,
            metadata: paymentIntent
        }, { transaction: t });

        // Generate Invoice
        await Invoice.create({
            transactionId: transaction.id,
            invoiceNumber: generateInvoiceNumber('INV'),
            issuedDate: new Date(),
            amount: amount,
            status: 'paid'
        }, { transaction: t });

        await t.commit();
        console.log('Transaction and Invoice recorded.');
    } catch (err) {
        await t.rollback();
        console.error('Error recording payment success:', err);
    }
}

async function handleTipPayment(paymentIntent, metadata, amount) {
    const fromUserId = parseInt(metadata.fromUserId);
    const toUserId = parseInt(metadata.toUserId);
    const note = metadata.note || '';
    const recipientName = metadata.recipientName || 'User';

    const t = await sequelize.transaction();
    try {
        // Check if already processed
        const existing = await Transaction.findOne({ where: { stripePaymentIntentId: paymentIntent.id } });
        if (existing) {
            console.log('Tip transaction already exists.');
            await t.rollback();
            return;
        }

        // Create Transaction record
        const transaction = await Transaction.create({
            userId: fromUserId,
            amount: amount,
            currency: 'MYR',
            status: 'succeeded',
            description: `Tip to ${recipientName}`,
            stripePaymentIntentId: paymentIntent.id,
            metadata: paymentIntent
        }, { transaction: t });

        // Create TipToken record
        await TipToken.create({
            fromUserId: fromUserId,
            toUserId: toUserId,
            amount: Math.round(amount), // Store as integer tokens (1 RM = 1 token for display)
            note: note
        }, { transaction: t });

        // Generate Invoice
        await Invoice.create({
            transactionId: transaction.id,
            invoiceNumber: generateInvoiceNumber('TIP'),
            issuedDate: new Date(),
            amount: amount,
            status: 'paid'
        }, { transaction: t });

        // Notify recipient
        const fromUser = await User.findByPk(fromUserId, { attributes: ['name'] });
        await Notification.create({
            user_id: toUserId,
            title: 'Tip Received! 🎉',
            message: `You received a tip of RM${amount.toFixed(2)} from ${fromUser?.name || 'a user'}!${note ? ` Note: "${note}"` : ''}`,
            status: 'unread'
        }, { transaction: t });

        await t.commit();
        console.log('Tip recorded successfully:', { fromUserId, toUserId, amount });
    } catch (err) {
        await t.rollback();
        console.error('Error recording tip payment:', err);
    }
}

// POST /webhook
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await handlePaymentSuccess(paymentIntent);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

module.exports = router;
