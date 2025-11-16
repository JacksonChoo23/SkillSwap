const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TipToken = sequelize.define('TipToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fromUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'from_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  toUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'to_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  }
}, {
  tableName: 'tip_tokens',
  timestamps: true,
  indexes: [
    {
      fields: ['fromUserId']
    },
    {
      fields: ['toUserId']
    }
  ]
});

module.exports = TipToken; 