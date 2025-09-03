'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get category IDs
    const categories = await queryInterface.sequelize.query(
      'SELECT id, name FROM categories;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    await queryInterface.bulkInsert('calculator_weights', [
      // Programming weights
      {
        category_id: categoryMap['Programming'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Programming'],
        level: 'intermediate',
        weight: 1.50,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Programming'],
        level: 'advanced',
        weight: 2.00,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Design weights
      {
        category_id: categoryMap['Design'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Design'],
        level: 'intermediate',
        weight: 1.40,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Design'],
        level: 'advanced',
        weight: 1.80,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Music weights
      {
        category_id: categoryMap['Music'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Music'],
        level: 'intermediate',
        weight: 1.30,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Music'],
        level: 'advanced',
        weight: 1.60,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Language weights
      {
        category_id: categoryMap['Language'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Language'],
        level: 'intermediate',
        weight: 1.20,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Language'],
        level: 'advanced',
        weight: 1.50,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Cooking weights
      {
        category_id: categoryMap['Cooking'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Cooking'],
        level: 'intermediate',
        weight: 1.20,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Cooking'],
        level: 'advanced',
        weight: 1.40,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Fitness weights
      {
        category_id: categoryMap['Fitness'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Fitness'],
        level: 'intermediate',
        weight: 1.10,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Fitness'],
        level: 'advanced',
        weight: 1.30,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Art weights
      {
        category_id: categoryMap['Art'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Art'],
        level: 'intermediate',
        weight: 1.25,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Art'],
        level: 'advanced',
        weight: 1.60,
        created_at: new Date(),
        updated_at: new Date()
      },

      // Business weights
      {
        category_id: categoryMap['Business'],
        level: 'beginner',
        weight: 1.00,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Business'],
        level: 'intermediate',
        weight: 1.35,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: categoryMap['Business'],
        level: 'advanced',
        weight: 1.70,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('calculator_weights', null, {});
  }
}; 