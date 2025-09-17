const { generateListingSuggestions } = require('../utils/geminiModeration');

describe('AI Listing Suggestions', () => {
  test('should generate teach suggestions for user with teach skills', async () => {
    const mockUserSkills = [
      { type: 'teach', Skill: { name: 'JavaScript' } },
      { type: 'teach', Skill: { name: 'React' } },
      { type: 'learn', Skill: { name: 'Python' } }
    ];

    const result = await generateListingSuggestions(mockUserSkills, 'teach');
    
    expect(result).toHaveProperty('suggestions');
    expect(result.suggestions).toHaveProperty('title');
    expect(result.suggestions).toHaveProperty('description');
    expect(result.suggestions).toHaveProperty('notes');
    expect(Array.isArray(result.suggestions.notes)).toBe(true);
    expect(result.suggestions.title).toContain('JavaScript');
  });

  test('should generate learn suggestions for user with learn skills', async () => {
    const mockUserSkills = [
      { type: 'learn', Skill: { name: 'Python' } },
      { type: 'learn', Skill: { name: 'Machine Learning' } },
      { type: 'teach', Skill: { name: 'JavaScript' } }
    ];

    const result = await generateListingSuggestions(mockUserSkills, 'learn');
    
    expect(result).toHaveProperty('suggestions');
    expect(result.suggestions).toHaveProperty('title');
    expect(result.suggestions).toHaveProperty('description');
    expect(result.suggestions).toHaveProperty('notes');
    expect(Array.isArray(result.suggestions.notes)).toBe(true);
    expect(result.suggestions.title).toContain('Python');
  });

  test('should handle empty user skills gracefully', async () => {
    const result = await generateListingSuggestions([], 'teach');
    
    expect(result).toHaveProperty('suggestions');
    expect(result.suggestions).toHaveProperty('title');
    expect(result.suggestions).toHaveProperty('description');
    expect(result.suggestions).toHaveProperty('notes');
    expect(result.suggestions.title).toBe('Share Your Knowledge & Skills');
  });

  test('should handle null user skills gracefully', async () => {
    const result = await generateListingSuggestions(null, 'learn');
    
    expect(result).toHaveProperty('suggestions');
    expect(result.suggestions).toHaveProperty('title');
    expect(result.suggestions).toHaveProperty('description');
    expect(result.suggestions).toHaveProperty('notes');
    expect(result.suggestions.title).toBe('Learn New Skills & Grow');
  });

  test('should provide different suggestions for teach vs learn', async () => {
    const mockUserSkills = [
      { type: 'teach', Skill: { name: 'Guitar' } },
      { type: 'learn', Skill: { name: 'Piano' } }
    ];

    const teachResult = await generateListingSuggestions(mockUserSkills, 'teach');
    const learnResult = await generateListingSuggestions(mockUserSkills, 'learn');
    
    expect(teachResult.suggestions.title).toContain('Guitar');
    expect(learnResult.suggestions.title).toContain('Piano');
    expect(teachResult.suggestions.title).not.toBe(learnResult.suggestions.title);
  });
});