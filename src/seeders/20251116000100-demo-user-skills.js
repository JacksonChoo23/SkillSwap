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

      // NEW USERS SKILLS

      // Zulkifli - Photographer
      { email: 'zulkifli@example.com', skill: 'Photography', type: 'teach', level: 'advanced' },
      { email: 'zulkifli@example.com', skill: 'Video Editing', type: 'teach', level: 'intermediate' },
      { email: 'zulkifli@example.com', skill: 'Graphic Design', type: 'teach', level: 'intermediate' },
      { email: 'zulkifli@example.com', skill: 'Marketing', type: 'learn', level: 'beginner' },
      { email: 'zulkifli@example.com', skill: 'React', type: 'learn', level: 'beginner' },

      // Michelle - Data scientist
      { email: 'michelle@example.com', skill: 'Python', type: 'teach', level: 'advanced' },
      { email: 'michelle@example.com', skill: 'Data Science', type: 'teach', level: 'advanced' },
      { email: 'michelle@example.com', skill: 'SQL', type: 'teach', level: 'advanced' },
      { email: 'michelle@example.com', skill: 'JavaScript', type: 'teach', level: 'intermediate' },
      { email: 'michelle@example.com', skill: 'Public Speaking', type: 'learn', level: 'beginner' },
      { email: 'michelle@example.com', skill: 'Yoga', type: 'learn', level: 'beginner' },

      // Amir - Mobile developer
      { email: 'amir@example.com', skill: 'Mobile Development', type: 'teach', level: 'advanced' },
      { email: 'amir@example.com', skill: 'JavaScript', type: 'teach', level: 'advanced' },
      { email: 'amir@example.com', skill: 'React', type: 'teach', level: 'intermediate' },
      { email: 'amir@example.com', skill: 'UI/UX Design', type: 'learn', level: 'intermediate' },
      { email: 'amir@example.com', skill: 'Guitar', type: 'learn', level: 'beginner' },

      // Jenny - Baker
      { email: 'jenny@example.com', skill: 'Baking', type: 'teach', level: 'advanced' },
      { email: 'jenny@example.com', skill: 'Chinese Cuisine', type: 'teach', level: 'intermediate' },
      { email: 'jenny@example.com', skill: 'Malaysian Cuisine', type: 'teach', level: 'intermediate' },
      { email: 'jenny@example.com', skill: 'Photography', type: 'learn', level: 'beginner' },
      { email: 'jenny@example.com', skill: 'Marketing', type: 'learn', level: 'beginner' },

      // Ravi - Tamil teacher
      { email: 'ravi@example.com', skill: 'Tamil', type: 'teach', level: 'advanced' },
      { email: 'ravi@example.com', skill: 'Singing', type: 'teach', level: 'intermediate' },
      { email: 'ravi@example.com', skill: 'Piano', type: 'teach', level: 'intermediate' },
      { email: 'ravi@example.com', skill: 'English', type: 'learn', level: 'intermediate' },
      { email: 'ravi@example.com', skill: 'Guitar', type: 'learn', level: 'beginner' },

      // Siti - Accountant
      { email: 'siti@example.com', skill: 'Accounting', type: 'teach', level: 'advanced' },
      { email: 'siti@example.com', skill: 'Excel', type: 'teach', level: 'advanced' },
      { email: 'siti@example.com', skill: 'Project Management', type: 'teach', level: 'intermediate' },
      { email: 'siti@example.com', skill: 'Graphic Design', type: 'learn', level: 'beginner' },
      { email: 'siti@example.com', skill: 'Photography', type: 'learn', level: 'beginner' },

      // Jason - Gamer
      { email: 'jason@example.com', skill: 'Gaming', type: 'teach', level: 'advanced' },
      { email: 'jason@example.com', skill: 'Video Editing', type: 'teach', level: 'intermediate' },
      { email: 'jason@example.com', skill: 'English', type: 'teach', level: 'intermediate' },
      { email: 'jason@example.com', skill: 'Japanese', type: 'learn', level: 'intermediate' },
      { email: 'jason@example.com', skill: 'Python', type: 'learn', level: 'beginner' },

      // Haziq - Mechanic
      { email: 'haziq@example.com', skill: 'Car Maintenance', type: 'teach', level: 'advanced' },
      { email: 'haziq@example.com', skill: 'Motorcycle Repair', type: 'teach', level: 'advanced' },
      { email: 'haziq@example.com', skill: 'Malay', type: 'teach', level: 'intermediate' },
      { email: 'haziq@example.com', skill: 'Marketing', type: 'learn', level: 'beginner' },
      { email: 'haziq@example.com', skill: 'Photography', type: 'learn', level: 'beginner' },

      // Mei Ling - Calligrapher
      { email: 'meiling@example.com', skill: 'Calligraphy', type: 'teach', level: 'advanced' },
      { email: 'meiling@example.com', skill: 'Mandarin', type: 'teach', level: 'advanced' },
      { email: 'meiling@example.com', skill: 'Drawing', type: 'teach', level: 'intermediate' },
      { email: 'meiling@example.com', skill: 'Digital Art', type: 'learn', level: 'beginner' },
      { email: 'meiling@example.com', skill: 'English', type: 'learn', level: 'intermediate' },

      // Kelvin - Swimming instructor
      { email: 'kelvin@example.com', skill: 'Swimming', type: 'teach', level: 'advanced' },
      { email: 'kelvin@example.com', skill: 'Weight Training', type: 'teach', level: 'intermediate' },
      { email: 'kelvin@example.com', skill: 'Running', type: 'teach', level: 'intermediate' },
      { email: 'kelvin@example.com', skill: 'Guitar', type: 'learn', level: 'beginner' },
      { email: 'kelvin@example.com', skill: 'Mandarin', type: 'learn', level: 'beginner' },

      // Anisah - Makeup artist
      { email: 'anisah@example.com', skill: 'Makeup', type: 'teach', level: 'advanced' },
      { email: 'anisah@example.com', skill: 'Fashion Styling', type: 'teach', level: 'intermediate' },
      { email: 'anisah@example.com', skill: 'Photography', type: 'teach', level: 'intermediate' },
      { email: 'anisah@example.com', skill: 'Baking', type: 'learn', level: 'beginner' },
      { email: 'anisah@example.com', skill: 'UI/UX Design', type: 'learn', level: 'beginner' },

      // Daniel - Spanish teacher
      { email: 'daniel@example.com', skill: 'Spanish', type: 'teach', level: 'advanced' },
      { email: 'daniel@example.com', skill: 'English', type: 'teach', level: 'advanced' },
      { email: 'daniel@example.com', skill: 'Guitar', type: 'teach', level: 'intermediate' },
      { email: 'daniel@example.com', skill: 'Malay', type: 'learn', level: 'beginner' },
      { email: 'daniel@example.com', skill: 'Malaysian Cuisine', type: 'learn', level: 'beginner' },

      // Farah - Interior designer
      { email: 'farah@example.com', skill: 'Interior Design', type: 'teach', level: 'advanced' },
      { email: 'farah@example.com', skill: 'Graphic Design', type: 'teach', level: 'intermediate' },
      { email: 'farah@example.com', skill: 'Drawing', type: 'teach', level: 'intermediate' },
      { email: 'farah@example.com', skill: 'Photography', type: 'learn', level: 'beginner' },
      { email: 'farah@example.com', skill: 'Marketing', type: 'learn', level: 'beginner' },

      // Vincent - Drone pilot
      { email: 'vincent@example.com', skill: 'Drone Flying', type: 'teach', level: 'advanced' },
      { email: 'vincent@example.com', skill: 'Photography', type: 'teach', level: 'advanced' },
      { email: 'vincent@example.com', skill: 'Video Editing', type: 'teach', level: 'advanced' },
      { email: 'vincent@example.com', skill: 'Swimming', type: 'learn', level: 'beginner' },
      { email: 'vincent@example.com', skill: 'Mandarin', type: 'learn', level: 'intermediate' },

      // Nur Aisyah - Quran teacher
      { email: 'aisyah@example.com', skill: 'Arabic', type: 'teach', level: 'advanced' },
      { email: 'aisyah@example.com', skill: 'Malay', type: 'teach', level: 'advanced' },
      { email: 'aisyah@example.com', skill: 'Calligraphy', type: 'teach', level: 'intermediate' },
      { email: 'aisyah@example.com', skill: 'English', type: 'learn', level: 'intermediate' },
      { email: 'aisyah@example.com', skill: 'Baking', type: 'learn', level: 'beginner' },
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
