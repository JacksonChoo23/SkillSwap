'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if tables already exist from earlier migrations
    const tables = await queryInterface.showAllTables();
    
    // Skip this migration if core tables already exist
    if (tables.includes('users') && tables.includes('categories')) {
      console.log('Core tables already exist from previous migrations. Skipping full schema creation.');
      return;
    }
    
    // USERS
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      bio: { type: Sequelize.TEXT, allowNull: true },
      location: { type: Sequelize.STRING(150), allowNull: true },
      is_public: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      role: { type: Sequelize.ENUM('user','admin'), allowNull: false, defaultValue: 'user' },
      whatsapp_number: { type: Sequelize.STRING(20), allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      reset_token: { type: Sequelize.STRING(64), allowNull: true },
      reset_expires_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('users', ['email'], { name: 'users_email_uq', unique: true });
    await queryInterface.addIndex('users', ['whatsapp_number'], { name: 'users_whatsapp_idx' });

    // CATEGORIES
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('categories', ['name'], { name: 'categories_name_uq', unique: true });

    // SKILLS
    await queryInterface.createTable('skills', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      category_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('skills', ['name'], { name: 'skills_name_idx' });
    await queryInterface.addIndex('skills', ['category_id'], { name: 'skills_category_idx' });

    // USER_SKILLS
    await queryInterface.createTable('user_skills', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      skill_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'skills', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      type: { type: Sequelize.ENUM('teach','learn'), allowNull: false },
      level: { type: Sequelize.ENUM('beginner','intermediate','advanced'), allowNull: false },
      years_experience: { type: Sequelize.INTEGER, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addConstraint('user_skills', {
      type: 'unique',
      fields: ['user_id','skill_id','type'],
      name: 'user_skills_user_skill_type_uq'
    });
    await queryInterface.addIndex('user_skills', ['user_id'], { name: 'user_skills_user_idx' });
    await queryInterface.addIndex('user_skills', ['skill_id'], { name: 'user_skills_skill_idx' });

    // AVAILABILITIES
    await queryInterface.createTable('availabilities', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      day_of_week: { type: Sequelize.ENUM('sun','mon','tue','wed','thu','fri','sat'), allowNull: false },
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: { type: Sequelize.TIME, allowNull: false },
      is_recurring: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('availabilities', ['user_id'], { name: 'avail_user_idx' });
    await queryInterface.addIndex('availabilities', ['day_of_week'], { name: 'avail_day_idx' });

    // LISTINGS
    await queryInterface.createTable('listings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      skill_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'skills', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      title: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      price_per_hour: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      visibility: { type: Sequelize.ENUM('public','private'), allowNull: false, defaultValue: 'public' },
      status: { type: Sequelize.ENUM('active','paused','closed'), allowNull: false, defaultValue: 'active' },
      location: { type: Sequelize.STRING(150), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('listings', ['user_id'], { name: 'listings_user_idx' });
    await queryInterface.addIndex('listings', ['skill_id'], { name: 'listings_skill_idx' });
    await queryInterface.addIndex('listings', ['status'], { name: 'listings_status_idx' });

    // MESSAGE_THREADS
    await queryInterface.createTable('message_threads', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      listing_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'listings', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      user_one_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      user_two_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('message_threads', ['listing_id'], { name: 'threads_listing_idx' });
    await queryInterface.addIndex('message_threads', ['user_one_id', 'user_two_id'], { name: 'threads_pair_idx' });
    await queryInterface.addConstraint('message_threads', {
      type: 'unique',
      fields: ['listing_id', 'user_one_id', 'user_two_id'],
      name: 'threads_listing_pair_uq'
    });

    // MESSAGES
    await queryInterface.createTable('messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      thread_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'message_threads', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      sender_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('messages', ['thread_id'], { name: 'messages_thread_idx' });
    await queryInterface.addIndex('messages', ['sender_id'], { name: 'messages_sender_idx' });

    // LEARNING_SESSIONS
    await queryInterface.createTable('learning_sessions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      listing_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'listings', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      skill_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'skills', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      teacher_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      student_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      scheduled_at: { type: Sequelize.DATE, allowNull: true },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.ENUM('pending','confirmed','completed','cancelled'), allowNull: false, defaultValue: 'pending' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('learning_sessions', ['teacher_id'], { name: 'ls_teacher_idx' });
    await queryInterface.addIndex('learning_sessions', ['student_id'], { name: 'ls_student_idx' });
    await queryInterface.addIndex('learning_sessions', ['skill_id'], { name: 'ls_skill_idx' });
    await queryInterface.addIndex('learning_sessions', ['status'], { name: 'ls_status_idx' });

    // RATINGS
    await queryInterface.createTable('ratings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      rater_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      ratee_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      session_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'learning_sessions', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      listing_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'listings', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      score: { type: Sequelize.TINYINT, allowNull: false },
      comment: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('ratings', ['ratee_id'], { name: 'ratings_ratee_idx' });
    await queryInterface.addIndex('ratings', ['rater_id'], { name: 'ratings_rater_idx' });
    await queryInterface.addIndex('ratings', ['session_id'], { name: 'ratings_session_idx' });

    // REPORTS
    await queryInterface.createTable('reports', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      reporter_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      reported_user_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      listing_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'listings', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      message_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'messages', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      reason: { type: Sequelize.ENUM('spam','abuse','scam','other'), allowNull: false },
      details: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('open','reviewing','resolved','dismissed'), allowNull: false, defaultValue: 'open' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('reports', ['reporter_id'], { name: 'reports_reporter_idx' });
    await queryInterface.addIndex('reports', ['status'], { name: 'reports_status_idx' });

    // TIP_TOKENS
    await queryInterface.createTable('tip_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sender_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      recipient_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      message: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.ENUM('pending','sent','failed','refunded'), allowNull: false, defaultValue: 'pending' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('tip_tokens', ['sender_id'], { name: 'tips_sender_idx' });
    await queryInterface.addIndex('tip_tokens', ['recipient_id'], { name: 'tips_recipient_idx' });

    // USER_PROGRESS
    await queryInterface.createTable('user_progress', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      session_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'learning_sessions', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      xp: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      badge: { type: Sequelize.STRING(80), allowNull: true },
      progress_percent: { type: Sequelize.DECIMAL(5,2), allowNull: false, defaultValue: 0.00 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('user_progress', ['user_id'], { name: 'user_progress_user_idx' });
    await queryInterface.addIndex('user_progress', ['session_id'], { name: 'user_progress_session_idx' });

    // CONTACT_HISTORIES
    await queryInterface.createTable('contact_histories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      peer_user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      channel: { type: Sequelize.ENUM('whatsapp','chat','email','other'), allowNull: false },
      last_contacted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      context: { type: Sequelize.TEXT, allowNull: true },
      total_contacts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addConstraint('contact_histories', {
      type: 'unique',
      fields: ['user_id','peer_user_id','channel'],
      name: 'contact_histories_user_peer_channel_uq'
    });
    await queryInterface.addIndex('contact_histories', ['user_id'], { name: 'ch_user_idx' });
    await queryInterface.addIndex('contact_histories', ['peer_user_id'], { name: 'ch_peer_idx' });
    await queryInterface.addIndex('contact_histories', ['last_contacted_at'], { name: 'ch_last_idx' });

    // CALCULATOR_WEIGHTS
    await queryInterface.createTable('calculator_weights', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      category_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      level: { type: Sequelize.ENUM('beginner','intermediate','advanced'), allowNull: false },
      weight: { type: Sequelize.DECIMAL(6,3), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addConstraint('calculator_weights', {
      type: 'unique',
      fields: ['category_id','level'],
      name: 'calc_weights_category_level_uq'
    });

    // SESSIONS (connect-session-sequelize compatible)
    await queryInterface.createTable('sessions', {
      sid: { type: Sequelize.STRING(128), primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      expires: { type: Sequelize.DATE, allowNull: true },
      data: { type: Sequelize.TEXT('long'), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('sessions', ['expires'], { name: 'sessions_expires_idx' });
    await queryInterface.addIndex('sessions', ['user_id'], { name: 'sessions_user_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sessions');
    await queryInterface.dropTable('calculator_weights');
    await queryInterface.dropTable('contact_histories');
    await queryInterface.dropTable('user_progress');
    await queryInterface.dropTable('tip_tokens');
    await queryInterface.dropTable('reports');
    await queryInterface.dropTable('ratings');
    await queryInterface.dropTable('learning_sessions');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('message_threads');
    await queryInterface.dropTable('listings');
    await queryInterface.dropTable('availabilities');
    await queryInterface.dropTable('user_skills');
    await queryInterface.dropTable('skills');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('users');
  }
};
