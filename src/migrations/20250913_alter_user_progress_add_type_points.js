'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // add columns if not exist
    const table = 'user_progress';
    // try add `type`
    try {
      await queryInterface.addColumn(table, 'type', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'generic'
      });
    } catch (e) {}
    // try add `points`
    try {
      await queryInterface.addColumn(table, 'points', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    } catch (e) {}
    // index
    try {
      await queryInterface.addIndex(table, ['type'], { name: 'user_progress_type_idx' });
    } catch (e) {}
  },
  async down(queryInterface, Sequelize) {
    try { await queryInterface.removeIndex('user_progress', 'user_progress_type_idx'); } catch (e) {}
    try { await queryInterface.removeColumn('user_progress', 'points'); } catch (e) {}
    try { await queryInterface.removeColumn('user_progress', 'type'); } catch (e) {}
  }
};
