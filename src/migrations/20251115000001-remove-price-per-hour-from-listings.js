'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the price_per_hour column from listings table
    const tableInfo = await queryInterface.describeTable('listings');
    
    if (tableInfo.price_per_hour) {
      await queryInterface.removeColumn('listings', 'price_per_hour');
      console.log('Removed price_per_hour column from listings table');
    } else {
      console.log('price_per_hour column does not exist, skipping removal');
    }
  },

  async down(queryInterface, Sequelize) {
    // Add back the price_per_hour column if we need to rollback
    await queryInterface.addColumn('listings', 'price_per_hour', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      after: 'description'
    });
    console.log('Added back price_per_hour column to listings table');
  }
};
