const matchingService = require('../src/services/matchingService');

describe('MatchingService', () => {
  describe('calculateAvailabilityOverlap', () => {
    it('should return 0 when no availabilities provided', () => {
      const result = matchingService.calculateAvailabilityOverlap([], []);
      expect(result).toBe(0);
    });

    it('should return 0 when one user has no availabilities', () => {
      const userAvailabilities = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }
      ];
      const matchAvailabilities = [];

      const result = matchingService.calculateAvailabilityOverlap(userAvailabilities, matchAvailabilities);
      expect(result).toBe(0);
    });

    it('should calculate overlap correctly for same day and time', () => {
      const userAvailabilities = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }
      ];
      const matchAvailabilities = [
        { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
      ];

      const result = matchingService.calculateAvailabilityOverlap(userAvailabilities, matchAvailabilities);
      expect(result).toBe(1);
    });

    it('should calculate partial overlap correctly', () => {
      const userAvailabilities = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' }
      ];
      const matchAvailabilities = [
        { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
        { dayOfWeek: 3, startTime: '15:00', endTime: '17:00' }
      ];

      const result = matchingService.calculateAvailabilityOverlap(userAvailabilities, matchAvailabilities);
      expect(result).toBe(0.5); // 1 overlap out of 2 possible overlaps
    });
  });
}); 