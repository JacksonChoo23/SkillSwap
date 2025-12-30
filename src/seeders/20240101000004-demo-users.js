'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    await queryInterface.bulkInsert('users', [
      // Admin user
      {
        name: 'Admin User',
        email: 'admin@skillswap.my',
        password_hash: passwordHash,
        bio: 'System administrator for SkillSwap MY platform.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456789',
        is_public: true,
        role: 'admin',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Demo users
      {
        name: 'Ahmad Rahman',
        email: 'ahmad@example.com',
        password_hash: passwordHash,
        bio: 'Software developer with 5 years of experience in web development. Love teaching and learning new technologies.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456001',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Sarah Chen',
        email: 'sarah@example.com',
        password_hash: passwordHash,
        bio: 'UI/UX designer passionate about creating beautiful and functional user experiences.',
        location: 'Penang, Malaysia',
        whatsapp_number: '60123456002',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Raj Kumar',
        email: 'raj@example.com',
        password_hash: passwordHash,
        bio: 'Music teacher specializing in guitar and piano. Available for both online and in-person lessons.',
        location: 'Johor Bahru, Malaysia',
        whatsapp_number: '60123456003',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Li Wei',
        email: 'liwei@example.com',
        password_hash: passwordHash,
        bio: 'Mandarin language tutor with experience teaching both children and adults.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456004',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Fatimah Ismail',
        email: 'fatimah@example.com',
        password_hash: passwordHash,
        bio: 'Professional chef specializing in Malaysian and Middle Eastern cuisine.',
        location: 'Malacca, Malaysia',
        whatsapp_number: '60123456005',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'David Wong',
        email: 'david@example.com',
        password_hash: passwordHash,
        bio: 'Fitness trainer and yoga instructor. Helping people achieve their health goals.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456006',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Nurul Huda',
        email: 'nurul@example.com',
        password_hash: passwordHash,
        bio: 'Digital artist and illustrator. Creating beautiful artwork for various projects.',
        location: 'Shah Alam, Malaysia',
        whatsapp_number: '60123456007',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Marcus Tan',
        email: 'marcus@example.com',
        password_hash: passwordHash,
        bio: 'Business consultant with expertise in marketing and project management.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456008',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Priya Patel',
        email: 'priya@example.com',
        password_hash: passwordHash,
        bio: 'English language teacher and public speaking coach.',
        location: 'Petaling Jaya, Malaysia',
        whatsapp_number: '60123456009',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      // NEW USERS - 15 additional users
      {
        name: 'Zulkifli Harun',
        email: 'zulkifli@example.com',
        password_hash: passwordHash,
        bio: 'Experienced photographer specializing in portrait and wedding photography. Also teaches basic and advanced photography courses.',
        location: 'Ipoh, Malaysia',
        whatsapp_number: '60123456010',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Michelle Lim',
        email: 'michelle@example.com',
        password_hash: passwordHash,
        bio: 'Data scientist with expertise in Python and machine learning. Passionate about teaching analytics to beginners.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456011',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Amir Syazwan',
        email: 'amir@example.com',
        password_hash: passwordHash,
        bio: 'Mobile app developer specializing in Flutter and React Native. Available for mentoring aspiring developers.',
        location: 'Cyberjaya, Malaysia',
        whatsapp_number: '60123456012',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Jenny Khoo',
        email: 'jenny@example.com',
        password_hash: passwordHash,
        bio: 'Professional baker and cake decorator. Running baking classes on weekends. Love sharing my passion for pastries!',
        location: 'Penang, Malaysia',
        whatsapp_number: '60123456013',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Ravi Krishnan',
        email: 'ravi@example.com',
        password_hash: passwordHash,
        bio: 'Tamil language teacher and cultural enthusiast. Teaching traditional Indian classical music as well.',
        location: 'Klang, Malaysia',
        whatsapp_number: '60123456014',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Siti Aminah',
        email: 'siti@example.com',
        password_hash: passwordHash,
        bio: 'Certified accountant offering bookkeeping and financial literacy classes. Excel spreadsheet expert.',
        location: 'Shah Alam, Malaysia',
        whatsapp_number: '60123456015',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Jason Lee',
        email: 'jason@example.com',
        password_hash: passwordHash,
        bio: 'Professional gamer and esports coach. Teaching competitive gaming strategies for DOTA2 and Valorant.',
        location: 'Selangor, Malaysia',
        whatsapp_number: '60123456016',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Haziq Abdullah',
        email: 'haziq@example.com',
        password_hash: passwordHash,
        bio: 'Automotive enthusiast and mechanic. Offering car maintenance and basic repair workshops.',
        location: 'Johor Bahru, Malaysia',
        whatsapp_number: '60123456017',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Mei Ling',
        email: 'meiling@example.com',
        password_hash: passwordHash,
        bio: 'Traditional Chinese calligraphy artist. Also teaching Cantonese and Chinese tea ceremony.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456018',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Kelvin Ooi',
        email: 'kelvin@example.com',
        password_hash: passwordHash,
        bio: 'Swimming instructor and lifeguard. Teaching all levels from beginners to competitive swimmers.',
        location: 'Subang Jaya, Malaysia',
        whatsapp_number: '60123456019',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Anisah Kamal',
        email: 'anisah@example.com',
        password_hash: passwordHash,
        bio: 'Professional makeup artist and beauty consultant. Offering personal styling and makeup workshops.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456020',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Daniel Fernandez',
        email: 'daniel@example.com',
        password_hash: passwordHash,
        bio: 'Spanish language teacher from Madrid, now based in KL. Native speaker offering conversational Spanish classes.',
        location: 'Kuala Lumpur, Malaysia',
        whatsapp_number: '60123456021',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Farah Zainal',
        email: 'farah@example.com',
        password_hash: passwordHash,
        bio: 'Interior designer with 8 years experience. Teaching home decoration and space planning basics.',
        location: 'Petaling Jaya, Malaysia',
        whatsapp_number: '60123456022',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Vincent Chua',
        email: 'vincent@example.com',
        password_hash: passwordHash,
        bio: 'Drone pilot and aerial photographer. Certified instructor for drone flying and video editing.',
        location: 'Kota Kinabalu, Malaysia',
        whatsapp_number: '60123456023',
        is_public: true,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Nur Aisyah',
        email: 'aisyah@example.com',
        password_hash: passwordHash,
        bio: 'Quran recitation teacher and tajweed expert. Also teaching Arabic language basics for beginners.',
        location: 'Seremban, Malaysia',
        is_public: false,
        role: 'user',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};