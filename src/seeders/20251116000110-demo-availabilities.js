'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query(
      "SELECT id, email FROM users;",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const userByEmail = Object.fromEntries(users.map(u => [u.email, u.id]));

    const now = new Date();

    const rows = [
      // Ahmad: Mon 18:00-20:00, Sat 10:00-12:00
      { email: 'ahmad@example.com', day: 1, start: '18:00:00', end: '20:00:00' },
      { email: 'ahmad@example.com', day: 6, start: '10:00:00', end: '12:00:00' },

      // Sarah: Wed 19:00-21:00
      { email: 'sarah@example.com', day: 3, start: '19:00:00', end: '21:00:00' },

      // Raj: Sun 14:00-16:00
      { email: 'raj@example.com',   day: 0, start: '14:00:00', end: '16:00:00' }
    ]
    .filter(r => userByEmail[r.email])
    .map(r => ({
      user_id: userByEmail[r.email],
      day_of_week: r.day,
      start_time: r.start,
      end_time: r.end,
      created_at: now,
      updated_at: now
    }));

    if (rows.length > 0) {
      await queryInterface.bulkInsert('availabilities', rows, {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DELETE a FROM availabilities a
      JOIN users u ON u.id = a.user_id
      WHERE u.email IN ('ahmad@example.com','sarah@example.com','raj@example.com');
    `);
  }
};
