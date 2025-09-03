'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('categories', [
      {
        name: 'Programming',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Design',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Music',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Language',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Cooking',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Fitness',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Art',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Business',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('categories', null, {});
  }
}; 