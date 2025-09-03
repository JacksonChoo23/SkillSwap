'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('users');
    // rename only if wrong
    if (desc.whatsappNumber && !desc.whatsapp_number) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `users` CHANGE COLUMN `whatsappNumber` `whatsapp_number` VARCHAR(20) NULL'
      );
    }
    // drop index if exists (best-effort)
    try { await queryInterface.removeIndex('users', 'users_whatsapp_number_idx'); } catch (e) {}
    await queryInterface.addIndex('users', ['whatsapp_number'], { name: 'users_whatsapp_number_idx' });
  },

  async down (queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('users');
    if (desc.whatsapp_number && !desc.whatsappNumber) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `users` CHANGE COLUMN `whatsapp_number` `whatsappNumber` VARCHAR(20) NULL'
      );
    }
    try { await queryInterface.removeIndex('users', 'users_whatsapp_number_idx'); } catch (e) {}
    await queryInterface.addIndex('users', ['whatsappNumber'], { name: 'users_whatsapp_number_idx' });
  }
};


