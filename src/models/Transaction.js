// src/models/Transaction.js
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'MYR'
    },
    status: {
        type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
    },
    stripePaymentIntentId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'stripe_payment_intent_id',
        unique: true
    },
    stripeChargeId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'stripe_charge_id'
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'transactions',
    timestamps: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
        { fields: ['stripe_payment_intent_id'] }
    ]
});

module.exports = Transaction;
