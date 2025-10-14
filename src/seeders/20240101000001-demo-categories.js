'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // (Optional safe clear) 如果你不想清全表，跳过这句，直接走 upsert
    await queryInterface.bulkDelete('categories', null, { truncate: false });

    const rows = [
      { name: 'Programming', is_active: true },
      { name: 'Design',      is_active: true },
      { name: 'Music',       is_active: true },
      { name: 'Language',    is_active: true },
      { name: 'Cooking',     is_active: true },
      { name: 'Fitness',     is_active: true },
      { name: 'Art',         is_active: true },
      { name: 'Business',    is_active: true }
    ];

    // 如果你的 Sequelize 配置了 underscored: true，DB 列是 snake_case，没问题。
    // 交给 DB 的默认时间，不要手写 created_at/updated_at，避免校验误差。
    await queryInterface.bulkInsert(
      'categories',
      rows.map(r => ({
        name: r.name,
        is_active: r.is_active,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      { updateOnDuplicate: ['is_active', 'updated_at'] }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('categories', {
      name: ['Programming','Design','Music','Language','Cooking','Fitness','Art','Business']
    });
  }
}; 