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
      // Ahmad's listings
      {
        email: 'ahmad@example.com',
        skill: 'JavaScript',
        learnSkill: 'UI/UX Design',
        title: 'Learn JavaScript Fundamentals with Practical Projects',
        description: 'Hands-on JavaScript sessions covering ES6+, DOM manipulation, and async programming. Perfect for beginners wanting to build interactive websites. I have 5 years of industry experience and can share real-world best practices.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'ahmad@example.com',
        skill: 'React',
        learnSkill: 'UI/UX Design',
        title: 'Modern React Development: Hooks, Context & More',
        description: 'Learn React from scratch or level up your existing skills. We will cover functional components, hooks, state management, and building production-ready applications.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'ahmad@example.com',
        skill: 'Guitar',
        learnSkill: 'Piano',
        title: 'Acoustic Guitar Basics and Techniques',
        description: 'Learn chords, strumming patterns, and simple songs. Perfect for beginners looking to start playing guitar. Lessons can be online or in-person in KL area.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Admin listings
      {
        email: 'admin@skillswap.my',
        skill: 'Node.js',
        learnSkill: 'Python',
        title: 'Node.js Mentorship: Build APIs with Express',
        description: 'Deep dive into Express.js, middleware patterns, and Sequelize ORM. Learn to build and deploy REST APIs following industry best practices. Suitable for developers with basic JavaScript knowledge.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Sarah's listings
      {
        email: 'sarah@example.com',
        skill: 'UI/UX Design',
        learnSkill: 'JavaScript',
        title: 'UI/UX Design Critique and Portfolio Guidance',
        description: 'Improve your design thinking, wireframes, and prototypes. Personalized critique sessions and portfolio guidance for aspiring designers.',
        visibility: 'public',
        status: 'active',
        location: 'Penang'
      },
      {
        email: 'sarah@example.com',
        skill: 'Graphic Design',
        learnSkill: 'React',
        title: 'Graphic Design Fundamentals with Adobe Suite',
        description: 'Master Photoshop, Illustrator, and InDesign. Learn composition, color theory, and typography to create professional designs.',
        visibility: 'public',
        status: 'active',
        location: 'Penang'
      },
      // Raj's listings
      {
        email: 'raj@example.com',
        skill: 'Guitar',
        learnSkill: 'Singing',
        title: 'Classical and Fingerstyle Guitar Lessons',
        description: 'From beginner to advanced techniques. Learn classical pieces, fingerpicking patterns, and music theory. Both online and in-person lessons available in JB.',
        visibility: 'public',
        status: 'active',
        location: 'Johor Bahru'
      },
      {
        email: 'raj@example.com',
        skill: 'Piano',
        learnSkill: 'Singing',
        title: 'Piano for All Ages - Beginner to Intermediate',
        description: 'Learn piano at your own pace. Classical, pop, and jazz styles covered. Exam preparation available (ABRSM/Trinity). Fun and structured lessons!',
        visibility: 'public',
        status: 'active',
        location: 'Johor Bahru'
      },
      // Li Wei's listings
      {
        email: 'liwei@example.com',
        skill: 'Mandarin',
        learnSkill: 'Japanese',
        title: 'Mandarin Chinese for Beginners',
        description: 'Start your Mandarin journey! Learn pronunciation, basic characters, and everyday conversational phrases. Patient teacher with experience teaching adults.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'liwei@example.com',
        skill: 'English',
        learnSkill: 'Python',
        title: 'Business English Communication Skills',
        description: 'Improve your English for professional settings. Email writing, presentations, and meeting skills. Suitable for working professionals.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Fatimah's listings
      {
        email: 'fatimah@example.com',
        skill: 'Malaysian Cuisine',
        learnSkill: 'Digital Art',
        title: 'Authentic Malaysian Cooking Classes',
        description: 'Learn to cook traditional Malaysian dishes like rendang, nasi lemak, and satay. Hands-on cooking sessions in a home kitchen setting in Malacca.',
        visibility: 'public',
        status: 'active',
        location: 'Malacca'
      },
      {
        email: 'fatimah@example.com',
        skill: 'Baking',
        learnSkill: 'Digital Art',
        title: 'Artisan Bread and Pastry Making',
        description: 'From sourdough to croissants, learn the art of baking. Small group classes with take-home recipes and techniques.',
        visibility: 'public',
        status: 'active',
        location: 'Malacca'
      },
      // David's listings
      {
        email: 'david@example.com',
        skill: 'Yoga',
        learnSkill: 'Malaysian Cuisine',
        title: 'Yoga for Beginners: Mind-Body Wellness',
        description: 'Start your yoga practice with proper foundation. Learn basic poses, breathing techniques, and meditation. All fitness levels welcome!',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'david@example.com',
        skill: 'Weight Training',
        learnSkill: 'Guitar',
        title: 'Personal Training: Strength and Conditioning',
        description: 'Build muscle, lose fat, or improve athletic performance. Customized training programs based on your goals. Available at gyms in KL area.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Nurul's listings
      {
        email: 'nurul@example.com',
        skill: 'Digital Art',
        learnSkill: 'Yoga',
        title: 'Digital Illustration with Procreate & Photoshop',
        description: 'Learn digital art from sketch to final illustration. Character design, backgrounds, and digital painting techniques. Tablet recommended.',
        visibility: 'public',
        status: 'active',
        location: 'Shah Alam'
      },
      {
        email: 'nurul@example.com',
        skill: 'Drawing',
        learnSkill: 'Yoga',
        title: 'Traditional Drawing: Pencil and Charcoal',
        description: 'Master the fundamentals of traditional drawing. Learn shading, perspective, and figure drawing. All materials provided for first session.',
        visibility: 'public',
        status: 'active',
        location: 'Shah Alam'
      },
      // Marcus's listings
      {
        email: 'marcus@example.com',
        skill: 'Marketing',
        learnSkill: 'Mandarin',
        title: 'Digital Marketing Strategy for Small Businesses',
        description: 'Learn to market your business online effectively. SEO, social media, content marketing, and analytics. Practical workshops with real case studies.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'marcus@example.com',
        skill: 'Project Management',
        learnSkill: 'Python',
        title: 'Agile Project Management Fundamentals',
        description: 'Learn Scrum, Kanban, and agile methodologies. Prepare for PMP or Scrum Master certification. Ideal for aspiring project managers.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      // Priya's listings
      {
        email: 'priya@example.com',
        skill: 'English',
        learnSkill: 'Piano',
        title: 'IELTS and TOEFL Preparation Classes',
        description: 'Prepare for English proficiency exams with focused training. Speaking, writing, reading, and listening practice. Score improvement guaranteed!',
        visibility: 'public',
        status: 'active',
        location: 'Petaling Jaya'
      },
      {
        email: 'priya@example.com',
        skill: 'Public Speaking',
        learnSkill: 'Baking',
        title: 'Confident Public Speaking and Presentation Skills',
        description: 'Overcome stage fright and become a compelling speaker. Learn storytelling, body language, and audience engagement techniques.',
        visibility: 'public',
        status: 'active',
        location: 'Petaling Jaya'
      }
    ];

    const rows = planned
      .filter(r => userByEmail[r.email] && skillByName[r.skill] && skillByName[r.learnSkill])
      .map(r => ({
        user_id: userByEmail[r.email],
        skill_id: skillByName[r.skill],
        learn_skill_id: skillByName[r.learnSkill],
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
    await queryInterface.bulkDelete('listings', null, {});
  }
};
