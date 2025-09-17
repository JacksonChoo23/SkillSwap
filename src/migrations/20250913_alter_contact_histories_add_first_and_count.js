'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // contact_histories: add missing columns used by code
    try {
      await queryInterface.addColumn('contact_histories', 'first_contacted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    } catch (e) {}
    try {
      await queryInterface.addColumn('contact_histories', 'count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    } catch (e) {}
    // simple backfill
    try {
      await queryInterface.sequelize.query(
        "UPDATE contact_histories SET first_contacted_at = COALESCE(first_contacted_at, last_contacted_at)"
      );
    } catch (e) {}
    try {
      await queryInterface.addIndex('contact_histories', ['first_contacted_at'], { name: 'ch_first_idx' });
    } catch (e) {}
  },
  async down(queryInterface, Sequelize) {
    try { await queryInterface.removeIndex('contact_histories', 'ch_first_idx'); } catch (e) {}
    try { await queryInterface.removeColumn('contact_histories', 'count'); } catch (e) {}
    try { await queryInterface.removeColumn('contact_histories', 'first_contacted_at'); } catch (e) {}
  }
};
