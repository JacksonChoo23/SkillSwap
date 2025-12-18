// src/models/Invoice.js
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'transaction_id',
        references: {
            model: 'transactions',
            key: 'id'
        }
    },
    invoiceNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'invoice_number'
    },
    issuedDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'issued_date',
        defaultValue: DataTypes.NOW
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'due_date'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('paid', 'void', 'refunded'),
        allowNull: false,
        defaultValue: 'paid'
    }
}, {
    tableName: 'invoices',
    timestamps: true,
    indexes: [
        { fields: ['transaction_id'] },
        { fields: ['invoice_number'] },
        { fields: ['status'] }
    ]
});

module.exports = Invoice;
