'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Map users by email
    const users = await queryInterface.sequelize.query(
      "SELECT id, email FROM users;",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const userByEmail = Object.fromEntries(users.map(u => [u.email, u.id]));

    // Map skills by name
    const skills = await queryInterface.sequelize.query(
      "SELECT id, name FROM skills;",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const skillByName = Object.fromEntries(skills.map(s => [s.name, s.id]));

    const now = new Date();

    const rows = [
      // Admin teaches Node.js (advanced)
      { email: 'admin@skillswap.my', skill: 'Node.js', type: 'teach', level: 'advanced' },

      // Ahmad teaches JavaScript (advanced) and Guitar (intermediate); learns UI/UX (beginner)
      { email: 'ahmad@example.com', skill: 'JavaScript', type: 'teach', level: 'advanced' },
      { email: 'ahmad@example.com', skill: 'Guitar',      type: 'teach', level: 'intermediate' },
      { email: 'ahmad@example.com', skill: 'UI/UX Design', type: 'learn', level: 'beginner' },

      // Sarah teaches UI/UX (advanced); learns JavaScript (beginner)
      { email: 'sarah@example.com', skill: 'UI/UX Design', type: 'teach', level: 'advanced' },
      { email: 'sarah@example.com', skill: 'JavaScript',   type: 'learn', level: 'beginner' },

      // Raj teaches Guitar (advanced); learns Piano (intermediate)
      { email: 'raj@example.com',   skill: 'Guitar', type: 'teach', level: 'advanced' },
      { email: 'raj@example.com',   skill: 'Piano',  type: 'learn', level: 'intermediate' },
    ]
    .filter(r => userByEmail[r.email] && skillByName[r.skill])
    .map(r => ({
      user_id: userByEmail[r.email],
      skill_id: skillByName[r.skill],
      type: r.type,
      level: r.level,
      created_at: now,
      updated_at: now
    }));

    if (rows.length > 0) {
      await queryInterface.bulkInsert('user_skills', rows, {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Delete by joining on emails and skill names for safety
    await queryInterface.sequelize.query(`
      DELETE us FROM user_skills us
      JOIN users u ON u.id = us.user_id
      JOIN skills s ON s.id = us.skill_id
      WHERE u.email IN ('admin@skillswap.my','ahmad@example.com','sarah@example.com','raj@example.com')
        AND s.name IN ('Node.js','JavaScript','Guitar','UI/UX Design','Piano');
    `);
  }
};
