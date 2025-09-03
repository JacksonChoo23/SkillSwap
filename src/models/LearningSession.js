const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LearningSession = sequelize.define('LearningSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'teacher_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'student_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  skillId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'skill_id',
    references: {
      model: 'skills',
      key: 'id'
    }
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_at'
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_at'
  },
  status: {
    type: DataTypes.ENUM('requested', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'requested'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'learning_sessions',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['teacher_id']
    },
    {
      fields: ['student_id']
    },
    {
      fields: ['start_at']
    }
  ]
});

// Named scope to include both user associations
LearningSession.addScope('withUsers', {
  include: [
    { model: sequelize.models.User, as: 'teacher', attributes: ['id','name'] },
    { model: sequelize.models.User, as: 'student', attributes: ['id','name'] }
  ]
});

module.exports = LearningSession;