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
        is_public: true,
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