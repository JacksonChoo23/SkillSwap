'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('contact_histories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      peer_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      channel: {
        type: Sequelize.ENUM('whatsapp'),
        allowNull: false,
        defaultValue: 'whatsapp'
      },
      first_contacted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      last_contacted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('contact_histories', {
      fields: ['user_id', 'peer_user_id', 'channel'],
      type: 'unique',
      name: 'contact_histories_unique_user_peer_channel'
    });
    await queryInterface.addIndex('contact_histories', ['user_id'], { name: 'ch_user_id' });
    await queryInterface.addIndex('contact_histories', ['peer_user_id'], { name: 'ch_peer_user_id' });
    await queryInterface.addIndex('contact_histories', ['last_contacted_at'], { name: 'ch_last' });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('contact_histories');
  }
};


