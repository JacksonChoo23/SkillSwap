'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('saved_suggestions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      suggestion_type: {
        type: Sequelize.ENUM('teach', 'learn'),
        allowNull: false
      },
      skill_category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      is_favorite: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('saved_suggestions', ['user_id']);
    await queryInterface.addIndex('saved_suggestions', ['user_id', 'is_favorite']);
    await queryInterface.addIndex('saved_suggestions', ['user_id', 'suggestion_type']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('saved_suggestions');
  }
};
