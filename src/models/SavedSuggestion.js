const { Model, DataTypes } = require('sequelize');

class SavedSuggestion extends Model {
  static associate(models) {
    // A saved suggestion belongs to a user
    SavedSuggestion.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }
}

module.exports = (sequelize) => {
  SavedSuggestion.init({
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
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    suggestion_type: {
      type: DataTypes.ENUM('teach', 'learn'),
      allowNull: false,
      validate: {
        isIn: [['teach', 'learn']]
      }
    },
    skill_category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'SavedSuggestion',
    tableName: 'saved_suggestions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['user_id', 'is_favorite']
      },
      {
        fields: ['user_id', 'suggestion_type']
      }
    ]
  });

  return SavedSuggestion;
};