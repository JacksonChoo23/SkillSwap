const matchService = require('../src/services/matchingService');
const { User, UserSkill, Availability } = require('../src/models');

jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  UserSkill: {},
  Availability: {},
}));

describe('MatchService', () => {
  it('should find matches for a user', async () => {
    User.findByPk.mockResolvedValue({
      id: 1,
      userSkills: [],
      availabilities: [],
    });

    User.findAll.mockResolvedValue([]);

    const userId = 1; // Example user ID
    const matches = await matchService.findMatches(userId);

    expect(matches).toBeDefined();
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBe(0);
  });
});