'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // learning_sessions: add start_at and end_at expected by routes
    try {
      await queryInterface.addColumn('learning_sessions', 'start_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    } catch (e) {}
    try {
      await queryInterface.addColumn('learning_sessions', 'end_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    } catch (e) {}
    try {
      await queryInterface.addIndex('learning_sessions', ['start_at'], { name: 'ls_start_idx' });
    } catch (e) {}
    try {
      await queryInterface.addIndex('learning_sessions', ['end_at'], { name: 'ls_end_idx' });
    } catch (e) {}
  },
  async down(queryInterface, Sequelize) {
    try { await queryInterface.removeIndex('learning_sessions', 'ls_end_idx'); } catch (e) {}
    try { await queryInterface.removeIndex('learning_sessions', 'ls_start_idx'); } catch (e) {}
    try { await queryInterface.removeColumn('learning_sessions', 'end_at'); } catch (e) {}
    try { await queryInterface.removeColumn('learning_sessions', 'start_at'); } catch (e) {}
  }
};
