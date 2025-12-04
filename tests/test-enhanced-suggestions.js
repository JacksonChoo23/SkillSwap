// Test the enhanced skill-specific suggestions with levels
const { generateListingSuggestions } = require('../utils/geminiModeration');

async function testEnhancedSuggestions() {
  console.log('🚀 Testing Enhanced Level-Aware AI Suggestions...\n');

  const testCases = [
    {
      name: 'Programming - Beginner Teacher',
      skills: [
        { type: 'teach', level: 'beginner', Skill: { name: 'JavaScript' } }
      ]
    },
    {
      name: 'Programming - Advanced Teacher',
      skills: [
        { type: 'teach', level: 'advanced', Skill: { name: 'Python' } }
      ]
    },
    {
      name: 'Language - Intermediate Teacher',
      skills: [
        { type: 'teach', level: 'intermediate', Skill: { name: 'English' } }
      ]
    },
    {
      name: 'Arts - Beginner Learner',
      skills: [
        { type: 'learn', level: 'beginner', Skill: { name: 'Guitar' } }
      ]
    },
    {
      name: 'Business - Advanced Learner',
      skills: [
        { type: 'learn', level: 'advanced', Skill: { name: 'Marketing' } }
      ]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name} ===`);

    try {
      const result = await generateListingSuggestions(
        testCase.skills,
        testCase.skills[0].type
      );

      console.log(`� Category: ${result.suggestions.category}`);
      console.log(`🎯 Level: ${result.suggestions.level}`);
      console.log(`📝 Title: ${result.suggestions.title}`);
      console.log(`📄 Description: ${result.suggestions.description}`);
      console.log(`🏆 Primary Skill: ${result.suggestions.primarySkill}`);

    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error.message);
    }
  }

  console.log('\n=== Comparison Test: Same Skill, Different Levels ===');

  const levels = ['beginner', 'intermediate', 'advanced'];
  for (const level of levels) {
    const skills = [{ type: 'teach', level: level, Skill: { name: 'React' } }];
    const result = await generateListingSuggestions(skills, 'teach');

    console.log(`\n${level.toUpperCase()} Level React Teacher:`);
    console.log(`   Title: ${result.suggestions.title}`);
    console.log(`   Level: ${result.suggestions.level}`);
  }

  console.log('\n✅ Enhanced level-aware suggestion testing completed!');
}

testEnhancedSuggestions();