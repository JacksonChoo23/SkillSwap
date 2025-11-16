const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageThread = sequelize.define('MessageThread', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  listingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'listing_id',
    references: {
      model: 'listings',
      key: 'id'
    }
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'creator_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  participantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'participant_id',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'message_threads',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['listingId', 'creatorId', 'participantId']
    },
    {
      fields: ['creatorId']
    },
    {
      fields: ['participantId']
    }
  ]
});

module.exports = MessageThread; 