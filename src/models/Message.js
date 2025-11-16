const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  threadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'thread_id',
    references: {
      model: 'message_threads',
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sender_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 2000]
    }
  }
}, {
  tableName: 'messages',
  timestamps: true,
  indexes: [
    {
      fields: ['threadId']
    },
    {
      fields: ['senderId']
    }
  ]
});

module.exports = Message; 