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
      // Ahmad: Mon, Wed, Sat
      { email: 'ahmad@example.com', day: 1, start: '18:00:00', end: '20:00:00' },
      { email: 'ahmad@example.com', day: 3, start: '19:00:00', end: '21:00:00' },
      { email: 'ahmad@example.com', day: 6, start: '10:00:00', end: '14:00:00' },

      // Sarah: Tue, Thu, Sat
      { email: 'sarah@example.com', day: 2, start: '18:00:00', end: '20:00:00' },
      { email: 'sarah@example.com', day: 4, start: '19:00:00', end: '21:00:00' },
      { email: 'sarah@example.com', day: 6, start: '09:00:00', end: '12:00:00' },

      // Raj: Sun, Mon, Wed
      { email: 'raj@example.com', day: 0, start: '14:00:00', end: '18:00:00' },
      { email: 'raj@example.com', day: 1, start: '10:00:00', end: '12:00:00' },
      { email: 'raj@example.com', day: 3, start: '15:00:00', end: '17:00:00' },

      // Li Wei: Weekday evenings
      { email: 'liwei@example.com', day: 1, start: '19:00:00', end: '21:00:00' },
      { email: 'liwei@example.com', day: 2, start: '19:00:00', end: '21:00:00' },
      { email: 'liwei@example.com', day: 4, start: '19:00:00', end: '21:00:00' },
      { email: 'liwei@example.com', day: 6, start: '10:00:00', end: '13:00:00' },

      // Fatimah: Weekday mornings, Sat, Sun
      { email: 'fatimah@example.com', day: 1, start: '09:00:00', end: '12:00:00' },
      { email: 'fatimah@example.com', day: 3, start: '09:00:00', end: '12:00:00' },
      { email: 'fatimah@example.com', day: 5, start: '09:00:00', end: '12:00:00' },
      { email: 'fatimah@example.com', day: 6, start: '14:00:00', end: '17:00:00' },
      { email: 'fatimah@example.com', day: 0, start: '14:00:00', end: '17:00:00' },

      // David: Early mornings and weekends
      { email: 'david@example.com', day: 1, start: '06:00:00', end: '08:00:00' },
      { email: 'david@example.com', day: 3, start: '06:00:00', end: '08:00:00' },
      { email: 'david@example.com', day: 5, start: '06:00:00', end: '08:00:00' },
      { email: 'david@example.com', day: 6, start: '08:00:00', end: '12:00:00' },
      { email: 'david@example.com', day: 0, start: '08:00:00', end: '12:00:00' },

      // Nurul: Evenings and weekends
      { email: 'nurul@example.com', day: 2, start: '19:00:00', end: '22:00:00' },
      { email: 'nurul@example.com', day: 4, start: '19:00:00', end: '22:00:00' },
      { email: 'nurul@example.com', day: 6, start: '14:00:00', end: '18:00:00' },
      { email: 'nurul@example.com', day: 0, start: '10:00:00', end: '14:00:00' },

      // Marcus: Lunch hours and evenings
      { email: 'marcus@example.com', day: 1, start: '12:00:00', end: '14:00:00' },
      { email: 'marcus@example.com', day: 3, start: '12:00:00', end: '14:00:00' },
      { email: 'marcus@example.com', day: 5, start: '18:00:00', end: '20:00:00' },
      { email: 'marcus@example.com', day: 6, start: '10:00:00', end: '14:00:00' },

      // Priya: Afternoons and weekends
      { email: 'priya@example.com', day: 2, start: '14:00:00', end: '17:00:00' },
      { email: 'priya@example.com', day: 4, start: '14:00:00', end: '17:00:00' },
      { email: 'priya@example.com', day: 6, start: '09:00:00', end: '13:00:00' },
      { email: 'priya@example.com', day: 0, start: '15:00:00', end: '18:00:00' },

      // Admin: Flexible
      { email: 'admin@skillswap.my', day: 1, start: '18:00:00', end: '20:00:00' },
      { email: 'admin@skillswap.my', day: 6, start: '10:00:00', end: '14:00:00' },

      // NEW USERS AVAILABILITIES

      // Zulkifli: Weekends mainly (photographer)
      { email: 'zulkifli@example.com', day: 6, start: '08:00:00', end: '12:00:00' },
      { email: 'zulkifli@example.com', day: 6, start: '14:00:00', end: '18:00:00' },
      { email: 'zulkifli@example.com', day: 0, start: '09:00:00', end: '13:00:00' },
      { email: 'zulkifli@example.com', day: 2, start: '19:00:00', end: '21:00:00' },

      // Michelle: Evenings (data scientist)
      { email: 'michelle@example.com', day: 1, start: '19:00:00', end: '21:30:00' },
      { email: 'michelle@example.com', day: 3, start: '19:00:00', end: '21:30:00' },
      { email: 'michelle@example.com', day: 5, start: '19:00:00', end: '21:00:00' },
      { email: 'michelle@example.com', day: 6, start: '10:00:00', end: '14:00:00' },

      // Amir: Weekday evenings (developer)
      { email: 'amir@example.com', day: 1, start: '20:00:00', end: '22:00:00' },
      { email: 'amir@example.com', day: 2, start: '20:00:00', end: '22:00:00' },
      { email: 'amir@example.com', day: 4, start: '20:00:00', end: '22:00:00' },
      { email: 'amir@example.com', day: 0, start: '14:00:00', end: '18:00:00' },

      // Jenny: Weekends (baker)
      { email: 'jenny@example.com', day: 6, start: '09:00:00', end: '13:00:00' },
      { email: 'jenny@example.com', day: 6, start: '15:00:00', end: '18:00:00' },
      { email: 'jenny@example.com', day: 0, start: '10:00:00', end: '15:00:00' },

      // Ravi: Evenings and weekends
      { email: 'ravi@example.com', day: 1, start: '18:00:00', end: '20:00:00' },
      { email: 'ravi@example.com', day: 3, start: '18:00:00', end: '20:00:00' },
      { email: 'ravi@example.com', day: 6, start: '10:00:00', end: '13:00:00' },
      { email: 'ravi@example.com', day: 0, start: '16:00:00', end: '19:00:00' },

      // Siti: Lunch and evenings (accountant)
      { email: 'siti@example.com', day: 1, start: '12:30:00', end: '14:00:00' },
      { email: 'siti@example.com', day: 2, start: '19:00:00', end: '21:00:00' },
      { email: 'siti@example.com', day: 4, start: '19:00:00', end: '21:00:00' },
      { email: 'siti@example.com', day: 6, start: '09:00:00', end: '12:00:00' },

      // Jason: Late nights and weekends (gamer)
      { email: 'jason@example.com', day: 1, start: '21:00:00', end: '23:00:00' },
      { email: 'jason@example.com', day: 3, start: '21:00:00', end: '23:00:00' },
      { email: 'jason@example.com', day: 5, start: '20:00:00', end: '23:00:00' },
      { email: 'jason@example.com', day: 6, start: '14:00:00', end: '20:00:00' },
      { email: 'jason@example.com', day: 0, start: '14:00:00', end: '20:00:00' },

      // Haziq: Mornings and weekends (mechanic)
      { email: 'haziq@example.com', day: 6, start: '08:00:00', end: '12:00:00' },
      { email: 'haziq@example.com', day: 0, start: '08:00:00', end: '12:00:00' },
      { email: 'haziq@example.com', day: 3, start: '09:00:00', end: '11:00:00' },

      // Mei Ling: Afternoons (calligrapher)
      { email: 'meiling@example.com', day: 2, start: '14:00:00', end: '17:00:00' },
      { email: 'meiling@example.com', day: 4, start: '14:00:00', end: '17:00:00' },
      { email: 'meiling@example.com', day: 6, start: '10:00:00', end: '14:00:00' },
      { email: 'meiling@example.com', day: 0, start: '14:00:00', end: '17:00:00' },

      // Kelvin: Early mornings and weekends (swimming)
      { email: 'kelvin@example.com', day: 1, start: '06:30:00', end: '08:30:00' },
      { email: 'kelvin@example.com', day: 3, start: '06:30:00', end: '08:30:00' },
      { email: 'kelvin@example.com', day: 5, start: '06:30:00', end: '08:30:00' },
      { email: 'kelvin@example.com', day: 6, start: '07:00:00', end: '11:00:00' },
      { email: 'kelvin@example.com', day: 0, start: '07:00:00', end: '11:00:00' },

      // Anisah: Evenings and weekends (makeup)
      { email: 'anisah@example.com', day: 2, start: '18:00:00', end: '21:00:00' },
      { email: 'anisah@example.com', day: 4, start: '18:00:00', end: '21:00:00' },
      { email: 'anisah@example.com', day: 6, start: '09:00:00', end: '18:00:00' },
      { email: 'anisah@example.com', day: 0, start: '09:00:00', end: '14:00:00' },

      // Daniel: Flexible (Spanish teacher)
      { email: 'daniel@example.com', day: 1, start: '10:00:00', end: '12:00:00' },
      { email: 'daniel@example.com', day: 1, start: '18:00:00', end: '20:00:00' },
      { email: 'daniel@example.com', day: 3, start: '10:00:00', end: '12:00:00' },
      { email: 'daniel@example.com', day: 5, start: '18:00:00', end: '20:00:00' },
      { email: 'daniel@example.com', day: 6, start: '10:00:00', end: '14:00:00' },

      // Farah: Evenings (interior designer)
      { email: 'farah@example.com', day: 2, start: '19:00:00', end: '21:00:00' },
      { email: 'farah@example.com', day: 4, start: '19:00:00', end: '21:00:00' },
      { email: 'farah@example.com', day: 6, start: '10:00:00', end: '16:00:00' },
      { email: 'farah@example.com', day: 0, start: '14:00:00', end: '17:00:00' },

      // Vincent: Weekends (drone pilot)
      { email: 'vincent@example.com', day: 6, start: '07:00:00', end: '11:00:00' },
      { email: 'vincent@example.com', day: 6, start: '15:00:00', end: '18:00:00' },
      { email: 'vincent@example.com', day: 0, start: '07:00:00', end: '11:00:00' },
      { email: 'vincent@example.com', day: 0, start: '15:00:00', end: '17:00:00' },

      // Aisyah: Mornings and evenings (Quran teacher)
      { email: 'aisyah@example.com', day: 1, start: '09:00:00', end: '11:00:00' },
      { email: 'aisyah@example.com', day: 2, start: '09:00:00', end: '11:00:00' },
      { email: 'aisyah@example.com', day: 3, start: '19:00:00', end: '21:00:00' },
      { email: 'aisyah@example.com', day: 4, start: '19:00:00', end: '21:00:00' },
      { email: 'aisyah@example.com', day: 6, start: '09:00:00', end: '12:00:00' },
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
    await queryInterface.bulkDelete('availabilities', null, {});
  }
};
