// src/models/listing.js
module.exports = (sequelize, DataTypes) => {
  const Listing = sequelize.define('Listing', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    // FK -> users.id
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },

    // FK -> skills.id (skill to teach)
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'skill_id'
    },

    // FK -> skills.id (skill to learn in exchange)
    learnSkillId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'learn_skill_id'
    },

    title: {
      // 你的表是 VARCHAR(150)，这里保持一致
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: [5, 150] }
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [10, 2000] }
    },

    visibility: {
      type: DataTypes.ENUM('public', 'private'),
      allowNull: false,
      defaultValue: 'public'
    },

    status: {
      // 和表一致：active / paused / closed
      type: DataTypes.ENUM('active', 'paused', 'closed'),
      allowNull: false,
      defaultValue: 'active'
    },

    location: {
      type: DataTypes.STRING(150),
      allowNull: true
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  }, {
    tableName: 'listings',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['skill_id'] },
      { fields: ['learn_skill_id'] },
      { fields: ['status'] }
    ]
  });

  // 关联
  Listing.associate = (models) => {
    Listing.belongsTo(models.User,  { foreignKey: 'userId',  as: 'User'  });
    Listing.belongsTo(models.Skill, { foreignKey: 'skillId', as: 'Skill' });
    Listing.belongsTo(models.Skill, { foreignKey: 'learnSkillId', as: 'LearnSkill' });
  };

  return Listing;
};
