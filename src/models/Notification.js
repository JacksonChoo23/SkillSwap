const { Model, DataTypes } = require('sequelize');

class Notification extends Model {
  static associate(models) {
    // A notification belongs to a user
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

module.exports = (sequelize) => {
  Notification.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('unread', 'read'),
      allowNull: false,
      defaultValue: 'unread',
      validate: {
        isIn: [['unread', 'read']]
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['user_id', 'status']
      }
    ]
  });

  return Notification;
};