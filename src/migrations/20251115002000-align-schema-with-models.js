'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. users: add whatsapp_number if missing
    const users = await queryInterface.describeTable('users');
    if (!users.whatsapp_number) {
      await queryInterface.addColumn('users', 'whatsapp_number', {
        type: Sequelize.STRING(20),
        allowNull: true
      });
    }

    // 2. listings: add missing columns and adjust status enum
    const listings = await queryInterface.describeTable('listings');
    if (!listings.skill_id) {
      await queryInterface.addColumn('listings', 'skill_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'skills', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }
    if (!listings.visibility) {
      await queryInterface.addColumn('listings', 'visibility', {
        type: Sequelize.ENUM('public', 'private'),
        allowNull: false,
        defaultValue: 'public'
      });
    }
    if (!listings.location) {
      await queryInterface.addColumn('listings', 'location', {
        type: Sequelize.STRING(150),
        allowNull: true
      });
    }

    // status enum conversion if old values present
    if (listings.status && listings.status.type.includes("'pending','approved','rejected'")) {
      // Rename old column temporarily
      await queryInterface.changeColumn('listings', 'status', {
        type: Sequelize.ENUM('active','paused','closed'),
        allowNull: false,
        defaultValue: 'active'
      });
      // Map existing values
      await queryInterface.sequelize.query("UPDATE listings SET status = 'active' WHERE status IN ('pending','approved')");
      await queryInterface.sequelize.query("UPDATE listings SET status = 'closed' WHERE status = 'rejected'");
    }

    // 3. contact_histories: create if missing
    try {
      await queryInterface.describeTable('contact_histories');
    } catch (e) {
      await queryInterface.createTable('contact_histories', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        peer_user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        channel: { type: Sequelize.ENUM('whatsapp'), allowNull: false, defaultValue: 'whatsapp' },
        first_contacted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        last_contacted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('contact_histories', ['user_id']);
      await queryInterface.addIndex('contact_histories', ['peer_user_id']);
      await queryInterface.addIndex('contact_histories', ['last_contacted_at']);
    }

    // 4. user_progress: create if missing
    try {
      await queryInterface.describeTable('user_progress');
    } catch (e) {
      await queryInterface.createTable('user_progress', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        session_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'learning_sessions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        type: { type: Sequelize.ENUM('learn','teach'), allowNull: false, defaultValue: 'learn' },
        points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('user_progress', ['user_id']);
      await queryInterface.addIndex('user_progress', ['session_id']);
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverse additions cautiously (do not drop enums if other tables depend)
    const listings = await queryInterface.describeTable('listings');
    if (listings.skill_id) await queryInterface.removeColumn('listings','skill_id');
    if (listings.visibility) await queryInterface.removeColumn('listings','visibility');
    if (listings.location) await queryInterface.removeColumn('listings','location');

    const users = await queryInterface.describeTable('users');
    if (users.whatsapp_number) await queryInterface.removeColumn('users','whatsapp_number');

    // Drop created tables
    try { await queryInterface.dropTable('contact_histories'); } catch(e) {}
    try { await queryInterface.dropTable('user_progress'); } catch(e) {}
  }
};
