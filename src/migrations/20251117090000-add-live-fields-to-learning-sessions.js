'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'learning_sessions';
    // Columns for live session flow
    try { await queryInterface.addColumn(table, 'start_code', { type: Sequelize.STRING(6), allowNull: true }); } catch (e) {}
    try { await queryInterface.addColumn(table, 'code_expires_at', { type: Sequelize.DATE, allowNull: true }); } catch (e) {}
    try { await queryInterface.addColumn(table, 'actual_start_at', { type: Sequelize.DATE, allowNull: true }); } catch (e) {}
    try { await queryInterface.addColumn(table, 'actual_end_at', { type: Sequelize.DATE, allowNull: true }); } catch (e) {}

    // Extend status enum to include in_progress (MySQL needs full enum list)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE ${table}
        MODIFY COLUMN status ENUM('requested','confirmed','in_progress','completed','cancelled') NOT NULL DEFAULT 'requested'
      `);
    } catch (e) {}

    // Indexes
    try { await queryInterface.addIndex(table, ['status'], { name: 'learning_sessions_status' }); } catch (e) {}
    try { await queryInterface.addIndex(table, ['actual_start_at'], { name: 'learning_sessions_actual_start_at' }); } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    const table = 'learning_sessions';
    // Drop indexes
    try { await queryInterface.removeIndex(table, 'learning_sessions_actual_start_at'); } catch (e) {}
    try { await queryInterface.removeIndex(table, 'learning_sessions_status'); } catch (e) {}

    // Revert enum (best-effort)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE ${table}
        MODIFY COLUMN status ENUM('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested'
      `);
    } catch (e) {}

    // Drop columns
    try { await queryInterface.removeColumn(table, 'actual_end_at'); } catch (e) {}
    try { await queryInterface.removeColumn(table, 'actual_start_at'); } catch (e) {}
    try { await queryInterface.removeColumn(table, 'code_expires_at'); } catch (e) {}
    try { await queryInterface.removeColumn(table, 'start_code'); } catch (e) {}
  }
};