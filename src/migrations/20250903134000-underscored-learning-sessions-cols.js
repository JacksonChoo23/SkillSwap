'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const desc = await queryInterface.describeTable('learning_sessions');
      if (desc.teacherId && !desc.teacher_id) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `teacherId` `teacher_id` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.studentId && !desc.student_id) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `studentId` `student_id` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.startAt && !desc.start_at) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `startAt` `start_at` DATETIME NOT NULL', { transaction: t }
        );
      }
      if (desc.endAt && !desc.end_at) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `endAt` `end_at` DATETIME NOT NULL', { transaction: t }
        );
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const desc = await queryInterface.describeTable('learning_sessions');
      if (desc.teacher_id && !desc.teacherId) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `teacher_id` `teacherId` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.student_id && !desc.studentId) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `student_id` `studentId` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.start_at && !desc.startAt) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `start_at` `startAt` DATETIME NOT NULL', { transaction: t }
        );
      }
      if (desc.end_at && !desc.endAt) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `learning_sessions` CHANGE COLUMN `end_at` `endAt` DATETIME NOT NULL', { transaction: t }
        );
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};


