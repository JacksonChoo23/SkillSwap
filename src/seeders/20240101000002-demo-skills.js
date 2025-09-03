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

    await queryInterface.bulkInsert('skills', [
      // Programming skills
      {
        name: 'JavaScript',
        category_id: categoryMap['Programming'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Python',
        category_id: categoryMap['Programming'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Java',
        category_id: categoryMap['Programming'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'React',
        category_id: categoryMap['Programming'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Node.js',
        category_id: categoryMap['Programming'],
        created_at: new Date(),
        updated_at: new Date()
      },

      // Design skills
      {
        name: 'UI/UX Design',
        category_id: categoryMap['Design'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Graphic Design',
        category_id: categoryMap['Design'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Web Design',
        category_id: categoryMap['Design'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Logo Design',
        category_id: categoryMap['Design'],
        created_at: new Date(),
        updated_at: new Date()
      },

      // Music skills
      {
        name: 'Guitar',
        category_id: categoryMap['Music'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Piano',
        category_id: categoryMap['Music'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Singing',
        category_id: categoryMap['Music'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Music Production',
        category_id: categoryMap['Music'],
        created_at: new Date(),
        updated_at: new Date()
      },

      // Language skills
      {
        name: 'English',
        category_id: categoryMap['Language'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Mandarin',
        category_id: categoryMap['Language'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Malay',
        category_id: categoryMap['Language'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Japanese',
        category_id: categoryMap['Language'],
        created_at: new Date(),
        updated_at: new Date()
      },

      // Cooking skills
      {
        name: 'Malaysian Cuisine',
        category_id: categoryMap['Cooking'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Baking',
        category_id: categoryMap['Cooking'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Chinese Cuisine',
        category_id: categoryMap['Cooking'],
        created_at: new Date(),
        updated_at: new Date()
      },

      // Fitness skills
      {
        name: 'Yoga',
        category_id: categoryMap['Fitness'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Weight Training',
        category_id: categoryMap['Fitness'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Running',
        category_id: categoryMap['Fitness'],
        created_at: new Date(),
        updated_at: new Date()
      },

      // Art skills
      {
        name: 'Drawing',
        category_id: categoryMap['Art'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Painting',
        category_id: categoryMap['Art'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Digital Art',
        category_id: categoryMap['Art'],
        created_at: new Date(),
        updated_at: new Date()
      },

      // Business skills
      {
        name: 'Marketing',
        category_id: categoryMap['Business'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Project Management',
        category_id: categoryMap['Business'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Public Speaking',
        category_id: categoryMap['Business'],
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('skills', null, {});
  }
}; 