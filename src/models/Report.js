const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reporterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  targetUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000]
    }
  },
  // Evidence files (array of file paths)
  evidence: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // Full AI analysis response
  aiAnalysis: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'ai_analysis'
  },
  // AI verdict summary
  aiVerdict: {
    type: DataTypes.ENUM('pending', 'violation', 'harmless', 'uncertain'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'ai_verdict'
  },
  // Severity level for violations
  severity: {
    type: DataTypes.ENUM('none', 'low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'none'
  },
  // Report status
  status: {
    type: DataTypes.ENUM('pending_ai', 'ai_reviewed', 'escalated', 'resolved', 'dismissed', 'auto_penalized'),
    defaultValue: 'pending_ai'
  },
  // Admin notes (for manual review)
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
  },
  // Penalty applied (if any)
  penaltyApplied: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'penalty_applied'
  }
}, {
  tableName: 'reports',
  timestamps: true,
  indexes: [
    {
      fields: ['reporterId']
    },
    {
      fields: ['targetUserId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['ai_verdict']
    },
    {
      fields: ['severity']
    }
  ]
});

module.exports = Report; 