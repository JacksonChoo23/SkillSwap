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
  }
}, {
  tableName: 'learning_sessions',
  freezeTableName: true,
  underscored: true,
  timestamps: false,
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

LearningSession.belongsTo(require('./User'), {
  as: 'teacher',
  foreignKey: { name: 'teacher_id', field: 'teacher_id', allowNull: false },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

LearningSession.belongsTo(require('./User'), {
  as: 'student',
  foreignKey: { name: 'student_id', field: 'student_id', allowNull: false },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

module.exports = LearningSession;