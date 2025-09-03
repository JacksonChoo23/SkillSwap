const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProgress = sequelize.define('UserProgress', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  sessionId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('learn', 'teach'), allowNull: false },
  points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'user_progress',
  timestamps: true
});

module.exports = UserProgress;


