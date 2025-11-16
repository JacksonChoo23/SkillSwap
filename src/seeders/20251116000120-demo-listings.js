'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query(
      "SELECT id, email FROM users;",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const userByEmail = Object.fromEntries(users.map(u => [u.email, u.id]));

    const skills = await queryInterface.sequelize.query(
      "SELECT id, name FROM skills;",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const skillByName = Object.fromEntries(skills.map(s => [s.name, s.id]));

    const now = new Date();

    const planned = [
      // Ahmad teaches JavaScript
      {
        email: 'ahmad@example.com',
        skill: 'JavaScript',
        title: 'Learn JavaScript Fundamentals with Practical Projects',
        description: 'Hands-on JavaScript sessions covering ES6+, DOM, and basic React intro. Suitable for beginners to intermediate learners.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Ahmad teaches Guitar
      {
        email: 'ahmad@example.com',
        skill: 'Guitar',
        title: 'Acoustic Guitar Basics and Techniques',
        description: 'Learn chords, strumming patterns, and simple songs. Perfect for beginners looking to start playing guitar.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Admin teaches Node.js
      {
        email: 'admin@skillswap.my',
        skill: 'Node.js',
        title: 'Node.js Mentorship: Build APIs with Express',
        description: 'Deep dive into Express, middleware, and Sequelize ORM. Build and deploy a REST API with best practices.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Sarah teaches UI/UX
      {
        email: 'sarah@example.com',
        skill: 'UI/UX Design',
        title: 'UI/UX Design Critique and Portfolio Guidance',
        description: 'Improve your design thinking, wireframes, and prototypes. Personalized critique sessions and portfolio guidance.',
        visibility: 'public',
        status: 'active',
        location: 'Penang'
      }
    ];

    const rows = planned
      .filter(r => userByEmail[r.email] && skillByName[r.skill])
      .map(r => ({
        user_id: userByEmail[r.email],
        skill_id: skillByName[r.skill],
        title: r.title,
        description: r.description,
        visibility: r.visibility,
        status: r.status,
        location: r.location,
        created_at: now,
        updated_at: now
      }));

    if (rows.length > 0) {
      await queryInterface.bulkInsert('listings', rows, {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DELETE l FROM listings l
      JOIN users u ON u.id = l.user_id
      WHERE u.email IN ('admin@skillswap.my','ahmad@example.com','sarah@example.com')
        AND l.title IN (
          'Learn JavaScript Fundamentals with Practical Projects',
          'Acoustic Guitar Basics and Techniques',
          'Node.js Mentorship: Build APIs with Express',
          'UI/UX Design Critique and Portfolio Guidance'
        );
    `);
  }
};
