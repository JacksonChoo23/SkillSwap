const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CalculatorWeight = sequelize.define('CalculatorWeight', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0.01,
      max: 10.00
    }
  }
}, {
  tableName: 'calculator_weights',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['categoryId', 'level']
    },
    {
      fields: ['categoryId']
    }
  ]
});

module.exports = CalculatorWeight; 