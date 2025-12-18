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
      // Admin - Node.js expert
      { email: 'admin@skillswap.my', skill: 'Node.js', type: 'teach', level: 'advanced' },
      { email: 'admin@skillswap.my', skill: 'JavaScript', type: 'teach', level: 'advanced' },
      { email: 'admin@skillswap.my', skill: 'Python', type: 'learn', level: 'intermediate' },

      // Ahmad - Full-stack developer, guitarist
      { email: 'ahmad@example.com', skill: 'JavaScript', type: 'teach', level: 'advanced' },
      { email: 'ahmad@example.com', skill: 'React', type: 'teach', level: 'advanced' },
      { email: 'ahmad@example.com', skill: 'Node.js', type: 'teach', level: 'intermediate' },
      { email: 'ahmad@example.com', skill: 'Guitar', type: 'teach', level: 'intermediate' },
      { email: 'ahmad@example.com', skill: 'UI/UX Design', type: 'learn', level: 'beginner' },
      { email: 'ahmad@example.com', skill: 'Piano', type: 'learn', level: 'beginner' },

      // Sarah - Designer
      { email: 'sarah@example.com', skill: 'UI/UX Design', type: 'teach', level: 'advanced' },
      { email: 'sarah@example.com', skill: 'Graphic Design', type: 'teach', level: 'advanced' },
      { email: 'sarah@example.com', skill: 'Web Design', type: 'teach', level: 'intermediate' },
      { email: 'sarah@example.com', skill: 'JavaScript', type: 'learn', level: 'beginner' },
      { email: 'sarah@example.com', skill: 'React', type: 'learn', level: 'beginner' },

      // Raj - Music teacher
      { email: 'raj@example.com', skill: 'Guitar', type: 'teach', level: 'advanced' },
      { email: 'raj@example.com', skill: 'Piano', type: 'teach', level: 'advanced' },
      { email: 'raj@example.com', skill: 'Music Production', type: 'teach', level: 'intermediate' },
      { email: 'raj@example.com', skill: 'Singing', type: 'learn', level: 'intermediate' },

      // Li Wei - Language tutor
      { email: 'liwei@example.com', skill: 'Mandarin', type: 'teach', level: 'advanced' },
      { email: 'liwei@example.com', skill: 'English', type: 'teach', level: 'intermediate' },
      { email: 'liwei@example.com', skill: 'Japanese', type: 'learn', level: 'beginner' },
      { email: 'liwei@example.com', skill: 'Python', type: 'learn', level: 'beginner' },

      // Fatimah - Chef
      { email: 'fatimah@example.com', skill: 'Malaysian Cuisine', type: 'teach', level: 'advanced' },
      { email: 'fatimah@example.com', skill: 'Baking', type: 'teach', level: 'advanced' },
      { email: 'fatimah@example.com', skill: 'Chinese Cuisine', type: 'teach', level: 'intermediate' },
      { email: 'fatimah@example.com', skill: 'Digital Art', type: 'learn', level: 'beginner' },

      // David - Fitness trainer
      { email: 'david@example.com', skill: 'Yoga', type: 'teach', level: 'advanced' },
      { email: 'david@example.com', skill: 'Weight Training', type: 'teach', level: 'advanced' },
      { email: 'david@example.com', skill: 'Running', type: 'teach', level: 'intermediate' },
      { email: 'david@example.com', skill: 'Malaysian Cuisine', type: 'learn', level: 'beginner' },
      { email: 'david@example.com', skill: 'Guitar', type: 'learn', level: 'beginner' },

      // Nurul - Digital artist
      { email: 'nurul@example.com', skill: 'Digital Art', type: 'teach', level: 'advanced' },
      { email: 'nurul@example.com', skill: 'Drawing', type: 'teach', level: 'advanced' },
      { email: 'nurul@example.com', skill: 'Painting', type: 'teach', level: 'intermediate' },
      { email: 'nurul@example.com', skill: 'Graphic Design', type: 'teach', level: 'intermediate' },
      { email: 'nurul@example.com', skill: 'Yoga', type: 'learn', level: 'beginner' },

      // Marcus - Business consultant
      { email: 'marcus@example.com', skill: 'Marketing', type: 'teach', level: 'advanced' },
      { email: 'marcus@example.com', skill: 'Project Management', type: 'teach', level: 'advanced' },
      { email: 'marcus@example.com', skill: 'Public Speaking', type: 'teach', level: 'intermediate' },
      { email: 'marcus@example.com', skill: 'Mandarin', type: 'learn', level: 'beginner' },
      { email: 'marcus@example.com', skill: 'Python', type: 'learn', level: 'beginner' },

      // Priya - English teacher
      { email: 'priya@example.com', skill: 'English', type: 'teach', level: 'advanced' },
      { email: 'priya@example.com', skill: 'Public Speaking', type: 'teach', level: 'advanced' },
      { email: 'priya@example.com', skill: 'Malay', type: 'teach', level: 'intermediate' },
      { email: 'priya@example.com', skill: 'Piano', type: 'learn', level: 'beginner' },
      { email: 'priya@example.com', skill: 'Baking', type: 'learn', level: 'beginner' },
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
    await queryInterface.bulkDelete('user_skills', null, {});
  }
};
