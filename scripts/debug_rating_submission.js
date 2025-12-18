const { User, LearningSession, Rating, Skill, Category } = require('../src/models');
const { sequelize } = require('../src/config/database');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function debug() {
    try {
        console.log('1. Creating test data...');

        // Create Category & Skill
        const [category] = await Category.findOrCreate({ where: { name: 'Debug Cat' }, defaults: { name: 'Debug Cat' } });
        const [skill] = await Skill.findOrCreate({ where: { name: 'Debug Skill' }, defaults: { name: 'Debug Skill', categoryId: category.id } });

        // Create Rater
        const raterEmail = `rater_debug_fixed@example.com`;
        const hash = await bcrypt.hash('password123', 10);
        const rater = await User.create({
            name: 'Rater Debug',
            email: raterEmail,
            passwordHash: hash,
            isVerified: true
        });

        // Create Ratee
        const ratee = await User.create({
            name: 'Ratee Debug',
            email: `ratee_debug_${Date.now()}@example.com`,
            passwordHash: hash,
            isVerified: true,
            isPublic: true
        });

        // Create Session
        const session = await LearningSession.create({
            teacherId: ratee.id,
            studentId: rater.id,
            skillId: skill.id,
            startAt: new Date(Date.now() - 7200000),
            endAt: new Date(Date.now() - 3600000),
            status: 'completed'
        });

        console.log('2. Test Data Created');
        console.log('---------------------------------------------------');
        console.log(`Rater Email: ${raterEmail}`);
        console.log(`Password: password123`);
        console.log(`Session URL: ${BASE_URL}/sessions/${session.id}`);
        console.log('---------------------------------------------------');

        process.exit(0);

    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

debug();
