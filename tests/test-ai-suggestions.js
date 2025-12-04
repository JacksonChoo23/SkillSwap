
const { generateListingSuggestions } = require('../utils/geminiModeration');

async function test() {
    console.log('Testing generateListingSuggestions...');

    const mockUserSkills = [
        { type: 'teach', Skill: { name: 'Python' }, level: 'intermediate' },
        { type: 'learn', Skill: { name: 'Guitar' } }
    ];

    const context = {
        user: { location: 'Kuala Lumpur' }
    };

    try {
        const result = await generateListingSuggestions(mockUserSkills, 'teach', context);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
