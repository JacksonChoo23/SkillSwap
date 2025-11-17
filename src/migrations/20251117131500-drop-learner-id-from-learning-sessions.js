'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Backfill student_id from legacy learner_id if needed, then drop learner_id
    const table = 'learning_sessions';
    // Copy values where student_id is NULL and learner_id exists
    await queryInterface.sequelize.query(`
      UPDATE \`${table}\`
      SET student_id = learner_id
      WHERE (student_id IS NULL OR student_id = 0) AND learner_id IS NOT NULL
    `);

    // Drop legacy learner_id column (also removes its FK constraint/index)
    try {
      await queryInterface.removeColumn(table, 'learner_id');
    } catch (err) {
      // Ignore if already removed
      console.warn('learner_id removeColumn warning (ignored):', err && err.message ? err.message : err);
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'learning_sessions';
    // Recreate learner_id as nullable, backfill from student_id for rollback
    try {
      await queryInterface.addColumn(table, 'learner_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      await queryInterface.sequelize.query(`
        UPDATE \`${table}\`
        SET learner_id = student_id
        WHERE learner_id IS NULL AND student_id IS NOT NULL
      `);
    } catch (err) {
      console.warn('learner_id addColumn/backfill warning (ignored):', err && err.message ? err.message : err);
    }
  }
};
