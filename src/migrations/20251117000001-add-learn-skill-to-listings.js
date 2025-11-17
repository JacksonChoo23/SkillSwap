'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const hasListings = tables.includes('listings');
    
    if (!hasListings) {
      console.log('listings table does not exist, skipping migration');
      return;
    }

    const columns = await queryInterface.describeTable('listings');
    
    if (!columns.learn_skill_id) {
      await queryInterface.addColumn('listings', 'learn_skill_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'skills',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      
      await queryInterface.addIndex('listings', ['learn_skill_id'], {
        name: 'listings_learn_skill_id'
      });
      
      console.log('Added learn_skill_id column to listings table');
    } else {
      console.log('learn_skill_id column already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const hasListings = tables.includes('listings');
    
    if (hasListings) {
      const columns = await queryInterface.describeTable('listings');
      
      if (columns.learn_skill_id) {
        await queryInterface.removeIndex('listings', 'listings_learn_skill_id');
        await queryInterface.removeColumn('listings', 'learn_skill_id');
      }
    }
  }
};
