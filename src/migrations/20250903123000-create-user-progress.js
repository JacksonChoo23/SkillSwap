"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_progress", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      sessionId: { type: Sequelize.INTEGER, allowNull: false },
      type: { type: Sequelize.ENUM('learn', 'teach'), allowNull: false },
      points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('user_progress', ['userId']);
    await queryInterface.addIndex('user_progress', ['sessionId']);
    await queryInterface.addIndex('user_progress', ['type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("user_progress");
  }
};


