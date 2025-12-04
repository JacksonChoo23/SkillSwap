const { User, UserSkill, Skill, Category, Availability, LearningSession } = require('../src/models');
const matchingService = require('../src/services/matchingService');
const { Op } = require('sequelize');

async function testMatching() {
    console.log('--- Testing Matching Optimization ---');
    try {
        // 1. Create Test Data
        // User A: Teaches 'Coding', Learns 'Cooking'
        // User B: Teaches 'Cooking', Learns 'Coding' (Perfect Match)
        // User C: Teaches 'Swimming', Learns 'Dancing' (No Match)

        // Ensure categories exist
        const [cat] = await Category.findOrCreate({ where: { name: 'Test Category' } });

        // Ensure skills exist
        const [skillCoding] = await Skill.findOrCreate({ where: { name: 'Test Coding', categoryId: cat.id } });
        const [skillCooking] = await Skill.findOrCreate({ where: { name: 'Test Cooking', categoryId: cat.id } });
        const [skillSwimming] = await Skill.findOrCreate({ where: { name: 'Test Swimming', categoryId: cat.id } });
        const [skillDancing] = await Skill.findOrCreate({ where: { name: 'Test Dancing', categoryId: cat.id } });

        // Create Users
        const userA = await User.create({ name: 'User A', email: 'usera@test.com', passwordHash: 'hashed', role: 'user', isPublic: true });
        const userB = await User.create({ name: 'User B', email: 'userb@test.com', passwordHash: 'hashed', role: 'user', isPublic: true });
        const userC = await User.create({ name: 'User C', email: 'userc@test.com', passwordHash: 'hashed', role: 'user', isPublic: true });

        // Assign Skills
        await UserSkill.create({ userId: userA.id, skillId: skillCoding.id, type: 'teach', level: 'advanced' });
        await UserSkill.create({ userId: userA.id, skillId: skillCooking.id, type: 'learn', level: 'beginner' });

        await UserSkill.create({ userId: userB.id, skillId: skillCooking.id, type: 'teach', level: 'advanced' });
        await UserSkill.create({ userId: userB.id, skillId: skillCoding.id, type: 'learn', level: 'beginner' });

        await UserSkill.create({ userId: userC.id, skillId: skillSwimming.id, type: 'teach', level: 'advanced' });
        await UserSkill.create({ userId: userC.id, skillId: skillDancing.id, type: 'learn', level: 'beginner' });

        // 2. Run Matching for User A
        console.log('Finding matches for User A...');
        const matches = await matchingService.findMatches(userA.id);

        console.log(`Found ${matches.length} matches.`);

        const matchB = matches.find(m => m.user.id === userB.id);
        const matchC = matches.find(m => m.user.id === userC.id);

        if (matchB) {
            console.log('✅ User B found (Correct)');
        } else {
            console.error('❌ User B NOT found (Failed)');
        }

        if (!matchC) {
            console.log('✅ User C NOT found (Correct)');
        } else {
            console.error('❌ User C found (Failed - should be filtered out)');
        }

        // Cleanup
        await UserSkill.destroy({ where: { userId: [userA.id, userB.id, userC.id] } });
        await User.destroy({ where: { id: [userA.id, userB.id, userC.id] } });
        // Keep skills/categories for simplicity or delete them too

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testMatching().then(() => process.exit());
