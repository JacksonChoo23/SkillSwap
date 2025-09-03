const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSkill = sequelize.define('UserSkill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  skillId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'skills',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('teach', 'learn'),
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false
  }
}, {
  tableName: 'user_skills',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'skillId', 'type']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['skillId']
    },
    {
      fields: ['type']
    }
  ]
});

module.exports = UserSkill; 