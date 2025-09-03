const calculatorService = require('../src/services/calculatorService');

describe('CalculatorService', () => {
  describe('getDefaultWeights', () => {
    it('should return default weights object', async () => {
      const weights = await calculatorService.getDefaultWeights();
      
      expect(weights).toHaveProperty('Programming');
      expect(weights).toHaveProperty('Design');
      expect(weights).toHaveProperty('Music');
      expect(weights).toHaveProperty('Language');
      expect(weights).toHaveProperty('Cooking');
      expect(weights).toHaveProperty('Fitness');
    });

    it('should have correct structure for each category', async () => {
      const weights = await calculatorService.getDefaultWeights();
      
      Object.values(weights).forEach(category => {
        expect(category).toHaveProperty('beginner');
        expect(category).toHaveProperty('intermediate');
        expect(category).toHaveProperty('advanced');
        
        expect(typeof category.beginner).toBe('number');
        expect(typeof category.intermediate).toBe('number');
        expect(typeof category.advanced).toBe('number');
      });
    });

    it('should have progressive weight values', async () => {
      const weights = await calculatorService.getDefaultWeights();
      
      Object.values(weights).forEach(category => {
        expect(category.beginner).toBeLessThanOrEqual(category.intermediate);
        expect(category.intermediate).toBeLessThanOrEqual(category.advanced);
      });
    });
  });
}); 