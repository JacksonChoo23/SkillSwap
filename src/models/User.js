// src/models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [2, 100] },
    field: 'name'
  },

  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
    field: 'email'
  },

  // DB: password_hash
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },

  bio: { type: DataTypes.TEXT, allowNull: true, validate: { len: [0, 1000] }, field: 'bio' },

  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: { len: [0, 255] },
    field: 'location'
  },

  // DB: whatsapp_number
  whatsappNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'whatsapp_number',
    validate: { is: /^\+[1-9]\d{1,14}$/ } // E.164；不想严格可以去掉
  },

  // DB: profile_image
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'profile_image'
  },

  // DB: is_public
  isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_public' },

  role: {
    type: DataTypes.ENUM('user', 'admin'),
    allowNull: false,
    defaultValue: 'user',
    field: 'role'
  },

  // 忘记密码：DB: reset_token
  resetToken: { type: DataTypes.STRING(255), allowNull: true, field: 'reset_token' },

  // 忘记密码：DB: reset_token_expiry
  resetTokenExpiry: { type: DataTypes.DATE, allowNull: true, field: 'reset_token_expiry' },

  // Email Verification
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified'
  },
  activationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'activation_token'
  },

  // Suspension & Penalty fields
  isSuspended: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_suspended'
  },
  suspensionEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'suspension_end_date'
  },
  suspensionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'suspension_reason'
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_banned'
  },
  warningCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'warning_count'
  },

  // 时间戳：DB 用 created_at / updated_at
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [{ unique: true, fields: ['email'] }]
});

// Define associations
User.associate = function (models) {
  // User has many saved suggestions
  User.hasMany(models.SavedSuggestion, {
    foreignKey: 'user_id',
    as: 'savedSuggestions'
  });
};

module.exports = User;
