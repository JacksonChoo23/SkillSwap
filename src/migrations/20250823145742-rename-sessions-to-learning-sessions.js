'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Rename sessions table to learning_sessions to avoid conflict with Express session table
    await queryInterface.renameTable('sessions', 'learning_sessions');
  },

  async down (queryInterface, Sequelize) {
    // Revert the rename
    await queryInterface.renameTable('learning_sessions', 'sessions');
  }
};
