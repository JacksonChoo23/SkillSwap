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
      },

      // NEW USERS LISTINGS

      // Zulkifli - Photographer
      {
        email: 'zulkifli@example.com',
        skill: 'Photography',
        learnSkill: 'Marketing',
        title: 'Master Portrait Photography',
        description: 'Learn to capture stunning portraits with proper lighting, composition, and posing techniques. Suitable for beginners with any camera type. Weekend outdoor sessions in Ipoh.',
        visibility: 'public',
        status: 'active',
        location: 'Ipoh'
      },
      {
        email: 'zulkifli@example.com',
        skill: 'Video Editing',
        learnSkill: 'React',
        title: 'Video Editing with Adobe Premiere Pro',
        description: 'Transform raw footage into professional videos. Learn cutting, transitions, color grading, and audio mixing. Perfect for content creators and aspiring filmmakers.',
        visibility: 'public',
        status: 'active',
        location: 'Ipoh'
      },

      // Michelle - Data scientist
      {
        email: 'michelle@example.com',
        skill: 'Python',
        learnSkill: 'Public Speaking',
        title: 'Python Programming for Data Analysis',
        description: 'Learn Python from scratch with focus on data analysis. Pandas, NumPy, and visualization libraries covered. Hands-on projects with real datasets.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'michelle@example.com',
        skill: 'Data Science',
        learnSkill: 'Yoga',
        title: 'Introduction to Machine Learning',
        description: 'Understand ML fundamentals including supervised and unsupervised learning. Build your first predictive models using scikit-learn.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },

      // Amir - Mobile developer
      {
        email: 'amir@example.com',
        skill: 'Mobile Development',
        learnSkill: 'UI/UX Design',
        title: 'Build Mobile Apps with Flutter',
        description: 'Create beautiful cross-platform mobile apps using Flutter and Dart. From beginner to publishing your first app on Play Store and App Store.',
        visibility: 'public',
        status: 'active',
        location: 'Cyberjaya'
      },

      // Jenny - Baker
      {
        email: 'jenny@example.com',
        skill: 'Baking',
        learnSkill: 'Photography',
        title: 'Weekend Cake Decorating Workshop',
        description: 'Learn professional cake decorating techniques including fondant work, piping, and sugar flowers. Small classes, maximum 4 participants.',
        visibility: 'public',
        status: 'active',
        location: 'Penang'
      },
      {
        email: 'jenny@example.com',
        skill: 'Chinese Cuisine',
        learnSkill: 'Marketing',
        title: 'Authentic Hokkien Home Cooking',
        description: 'Learn traditional Penang Hokkien dishes from a local chef. Char kway teow, hokkien mee, and more. Taste history in every dish!',
        visibility: 'public',
        status: 'active',
        location: 'Penang'
      },

      // Ravi - Tamil teacher
      {
        email: 'ravi@example.com',
        skill: 'Tamil',
        learnSkill: 'English',
        title: 'Learn Tamil Language - All Levels',
        description: 'Comprehensive Tamil lessons for beginners to advanced learners. Focus on reading, writing, and conversational skills. Cultural context included.',
        visibility: 'public',
        status: 'active',
        location: 'Klang'
      },
      {
        email: 'ravi@example.com',
        skill: 'Singing',
        learnSkill: 'Guitar',
        title: 'Indian Classical Carnatic Music Basics',
        description: 'Introduction to Carnatic music, ragas, and proper vocal techniques. Learn traditional devotional and classical songs.',
        visibility: 'public',
        status: 'active',
        location: 'Klang'
      },

      // Siti - Accountant
      {
        email: 'siti@example.com',
        skill: 'Accounting',
        learnSkill: 'Graphic Design',
        title: 'Bookkeeping Basics for Small Business Owners',
        description: 'Learn essential bookkeeping skills including invoicing, expense tracking, and financial statements. No accounting background required.',
        visibility: 'public',
        status: 'active',
        location: 'Shah Alam'
      },
      {
        email: 'siti@example.com',
        skill: 'Excel',
        learnSkill: 'Photography',
        title: 'Advanced Excel for Business Professionals',
        description: 'Master pivot tables, VLOOKUP, macros, and data visualization. Transform raw data into actionable business insights.',
        visibility: 'public',
        status: 'active',
        location: 'Shah Alam'
      },

      // Jason - Gamer  
      {
        email: 'jason@example.com',
        skill: 'Gaming',
        learnSkill: 'Japanese',
        title: 'Esports Coaching: Rank Up in Valorant',
        description: 'Improve your competitive gaming skills with personalized coaching. Aim training, game sense, and team coordination strategies.',
        visibility: 'public',
        status: 'active',
        location: 'Selangor'
      },

      // Haziq - Mechanic
      {
        email: 'haziq@example.com',
        skill: 'Car Maintenance',
        learnSkill: 'Marketing',
        title: 'Basic Car Maintenance Workshop',
        description: 'Learn essential car maintenance: oil changes, tire care, battery checks, and troubleshooting common issues. Save money and extend your car life!',
        visibility: 'public',
        status: 'active',
        location: 'Johor Bahru'
      },

      // Mei Ling - Calligrapher
      {
        email: 'meiling@example.com',
        skill: 'Calligraphy',
        learnSkill: 'Digital Art',
        title: 'Chinese Brush Calligraphy for Beginners',
        description: 'Learn the art of Chinese calligraphy using traditional brush and ink. Develop patience and mindfulness while creating beautiful characters.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'meiling@example.com',
        skill: 'Mandarin',
        learnSkill: 'English',
        title: 'Conversational Mandarin for Adults',
        description: 'Practical Mandarin for everyday situations. Focus on speaking and listening with native speaker. Flexible scheduling available.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },

      // Kelvin - Swimming
      {
        email: 'kelvin@example.com',
        skill: 'Swimming',
        learnSkill: 'Guitar',
        title: 'Learn to Swim - Adults & Children',
        description: 'Overcome your fear of water or perfect your strokes. Certified instructor with 10 years experience. Pool sessions in Subang area.',
        visibility: 'public',
        status: 'active',
        location: 'Subang Jaya'
      },

      // Anisah - Makeup
      {
        email: 'anisah@example.com',
        skill: 'Makeup',
        learnSkill: 'Baking',
        title: 'Professional Makeup Techniques',
        description: 'Learn makeup application for everyday, events, and bridal. Includes skin prep, contouring, and product selection. All skill levels welcome.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'anisah@example.com',
        skill: 'Fashion Styling',
        learnSkill: 'UI/UX Design',
        title: 'Personal Styling and Wardrobe Consultation',
        description: 'Discover your style, build a capsule wardrobe, and learn to dress for your body type. Virtual or in-person consultations available.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },

      // Daniel - Spanish
      {
        email: 'daniel@example.com',
        skill: 'Spanish',
        learnSkill: 'Malay',
        title: 'Learn Spanish with a Native Speaker',
        description: 'Conversational Spanish from a Madrid native. Perfect for travel, work, or just for fun! All levels from absolute beginner to advanced.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },
      {
        email: 'daniel@example.com',
        skill: 'Guitar',
        learnSkill: 'Malaysian Cuisine',
        title: 'Spanish Flamenco Guitar Introduction',
        description: 'Learn the passionate art of flamenco guitar. Basic techniques, rhythms, and simple pieces. Bring your own guitar.',
        visibility: 'public',
        status: 'active',
        location: 'Kuala Lumpur'
      },

      // Farah - Interior designer
      {
        email: 'farah@example.com',
        skill: 'Interior Design',
        learnSkill: 'Photography',
        title: 'Home Decoration and Space Planning',
        description: 'Transform your living space with professional interior design tips. Learn about color schemes, furniture arrangement, and budget-friendly decor.',
        visibility: 'public',
        status: 'active',
        location: 'Petaling Jaya'
      },

      // Vincent - Drone pilot
      {
        email: 'vincent@example.com',
        skill: 'Drone Flying',
        learnSkill: 'Swimming',
        title: 'Drone Photography & Videography Course',
        description: 'Get certified to fly drones in Malaysia. Learn regulations, flight techniques, and aerial photography. Equipment provided for training.',
        visibility: 'public',
        status: 'active',
        location: 'Kota Kinabalu'
      },
      {
        email: 'vincent@example.com',
        skill: 'Photography',
        learnSkill: 'Mandarin',
        title: 'Landscape Photography in Sabah',
        description: 'Capture stunning landscapes of Borneo. Join weekend photography trips to scenic locations. All skill levels welcome.',
        visibility: 'public',
        status: 'active',
        location: 'Kota Kinabalu'
      },

      // Aisyah - Quran teacher (private profile, no public listings)
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
