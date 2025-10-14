'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContactHistory = sequelize.define('ContactHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  peerUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'peer_user_id'
  },
  channel: {
    type: DataTypes.ENUM('whatsapp'),
    allowNull: false,
    defaultValue: 'whatsapp'
  },
  firstContactedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'first_contacted_at'
  },
  lastContactedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'last_contacted_at'
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' }
}, {
  tableName: 'contact_histories',
  underscored: true
});

ContactHistory.associate = (models) => {
  ContactHistory.belongsTo(models.User, {
    as: 'actor',
    foreignKey: { name: 'user_id', field: 'user_id' }
  });
  ContactHistory.belongsTo(models.User, {
    as: 'peer',
    foreignKey: { name: 'peer_user_id', field: 'peer_user_id' }
  });
};

module.exports = ContactHistory;


