'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const desc = await queryInterface.describeTable('user_progress');
      if (desc.userId && !desc.user_id) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `userId` `user_id` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.sessionId && !desc.session_id) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `sessionId` `session_id` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.createdAt && !desc.created_at) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `createdAt` `created_at` DATETIME NOT NULL DEFAULT NOW()', { transaction: t }
        );
      }
      if (desc.updatedAt && !desc.updated_at) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `updatedAt` `updated_at` DATETIME NOT NULL DEFAULT NOW()', { transaction: t }
        );
      }

      // 重新建立索引（先移除，存在与否都吞掉）
      try { await queryInterface.removeIndex('user_progress', 'user_progress_user_id', { transaction: t }); } catch(e) {}
      try { await queryInterface.removeIndex('user_progress', 'user_progress_session_id', { transaction: t }); } catch(e) {}
      try { await queryInterface.removeIndex('user_progress', 'user_progress_type', { transaction: t }); } catch(e) {}

      await queryInterface.addIndex('user_progress', ['user_id'], { name: 'user_progress_user_id', transaction: t });
      await queryInterface.addIndex('user_progress', ['session_id'], { name: 'user_progress_session_id', transaction: t });
      await queryInterface.addIndex('user_progress', ['type'], { name: 'user_progress_type', transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const desc = await queryInterface.describeTable('user_progress');
      if (desc.user_id && !desc.userId) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `user_id` `userId` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.session_id && !desc.sessionId) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `session_id` `sessionId` INTEGER NOT NULL', { transaction: t }
        );
      }
      if (desc.created_at && !desc.createdAt) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `created_at` `createdAt` DATETIME NOT NULL DEFAULT NOW()', { transaction: t }
        );
      }
      if (desc.updated_at && !desc.updatedAt) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `user_progress` CHANGE COLUMN `updated_at` `updatedAt` DATETIME NOT NULL DEFAULT NOW()', { transaction: t }
        );
      }

      try { await queryInterface.removeIndex('user_progress', 'user_progress_user_id', { transaction: t }); } catch(e) {}
      try { await queryInterface.removeIndex('user_progress', 'user_progress_session_id', { transaction: t }); } catch(e) {}
      try { await queryInterface.removeIndex('user_progress', 'user_progress_type', { transaction: t }); } catch(e) {}

      await queryInterface.addIndex('user_progress', ['userId'], { name: 'user_progress_user_id', transaction: t });
      await queryInterface.addIndex('user_progress', ['sessionId'], { name: 'user_progress_session_id', transaction: t });
      await queryInterface.addIndex('user_progress', ['type'], { name: 'user_progress_type', transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};


