// src/routes/payment.js
'use strict';

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const { Transaction, Invoice, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper: Generate Invoice Number
function generateInvoiceNumber() {
    const prefix = 'INV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
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

// GET /payment/checkout - Checkout page (for initiating payment)
router.get('/checkout', isAuthenticated, (req, res) => {
    // Amount can be passed via query string, e.g., /payment/checkout?amount=50&description=Tip
    const { amount, description } = req.query;
    res.render('payment/checkout', {
        title: 'Checkout',
        amount: amount || '',
        description: description || 'SkillSwap Payment',
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    });
});

// POST /payment/create-transaction - Create a transaction (Placeholder without Stripe)
router.post('/create-transaction', isAuthenticated, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { amount, description } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        // Create pending transaction
        const transaction = await Transaction.create({
            userId: req.user.id,
            amount: parseFloat(amount),
            currency: 'MYR',
            status: 'pending',
            description: description || 'SkillSwap Payment',
            stripePaymentIntentId: null, // Will be set when Stripe is integrated
            metadata: { createdBy: 'manual' }
        }, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            transactionId: transaction.id,
            message: 'Transaction created. Stripe integration pending.'
        });
    } catch (error) {
        await t.rollback();
        console.error('Create transaction error:', error);
        res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
});

// POST /payment/simulate-success/:id - Simulate successful payment (DEV ONLY)
router.post('/simulate-success/:id', isAuthenticated, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const transaction = await Transaction.findOne({
            where: { id: req.params.id, userId: req.user.id, status: 'pending' }
        });

        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'Pending transaction not found' });
        }

        // Update transaction to succeeded
        transaction.status = 'succeeded';
        transaction.stripeChargeId = `sim_charge_${Date.now()}`;
        await transaction.save({ transaction: t });

        // Generate invoice
        const invoice = await Invoice.create({
            transactionId: transaction.id,
            invoiceNumber: generateInvoiceNumber(),
            issuedDate: new Date(),
            amount: transaction.amount,
            status: 'paid'
        }, { transaction: t });

        await t.commit();

        req.flash('success', 'Payment simulated successfully!');
        res.json({ success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber });
    } catch (error) {
        await t.rollback();
        console.error('Simulate success error:', error);
        res.status(500).json({ success: false, error: 'Failed to simulate payment' });
    }
});

// POST /payment/refund/:id - Request a refund
router.post('/refund/:id', isAuthenticated, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const transaction = await Transaction.findOne({
            where: { id: req.params.id, userId: req.user.id, status: 'succeeded' },
            include: [{ model: Invoice, as: 'invoice' }]
        });

        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'Eligible transaction not found' });
        }

        // Update transaction status
        transaction.status = 'refunded';
        await transaction.save({ transaction: t });

        // Update invoice status
        if (transaction.invoice) {
            transaction.invoice.status = 'refunded';
            await transaction.invoice.save({ transaction: t });
        }

        await t.commit();

        // When Stripe is integrated, call stripe.refunds.create() here

        req.flash('success', 'Refund processed successfully.');
        res.json({ success: true, message: 'Refund processed' });
    } catch (error) {
        await t.rollback();
        console.error('Refund error:', error);
        res.status(500).json({ success: false, error: 'Failed to process refund' });
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

// ==================== WEBHOOK (Placeholder) ====================
// This would handle Stripe webhooks when integrated
// router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => { ... });

module.exports = router;
