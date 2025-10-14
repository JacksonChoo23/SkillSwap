const { CalculatorWeight, Skill, Category } = require('../models');

class CalculatorService {
  async calculateFairExchange(skillAId, skillBId, levelA, levelB, hoursA, hoursB) {
    try {
      // Get skills with their categories
      const skillA = await Skill.findByPk(skillAId, { include: [Category] });
      const skillB = await Skill.findByPk(skillBId, { include: [Category] });

      if (!skillA || !skillB) {
        throw new Error('One or both skills not found');
      }

      // Get weights for both skills
      const weightA = await CalculatorWeight.findOne({
        where: {
          categoryId: skillA.categoryId,
          level: levelA
        }
      });

      const weightB = await CalculatorWeight.findOne({
        where: {
          categoryId: skillB.categoryId,
          level: levelB
        }
      });

      if (!weightA || !weightB) {
        throw new Error('Weights not found for one or both skill combinations');
      }

      // Calculate values
      const valueA = hoursA * parseFloat(weightA.weight);
      const valueB = hoursB * parseFloat(weightB.weight);

      // Calculate ratio
      const ratio = valueA / valueB;

      // Calculate fair hours for skill B
      const fairHoursB = (valueA / parseFloat(weightB.weight));

      // Determine if exchange is fair
      const isFair = Math.abs(ratio - 1) <= 0.1; // Within 10% is considered fair

      // Generate suggestion
      let suggestion = '';
      if (ratio > 1.1) {
        suggestion = `Skill A is worth more. Consider increasing hours for Skill B to ${fairHoursB.toFixed(1)} hours for a fair exchange.`;
      } else if (ratio < 0.9) {
        suggestion = `Skill B is worth more. Consider increasing hours for Skill A to ${(valueB / parseFloat(weightA.weight)).toFixed(1)} hours for a fair exchange.`;
      } else {
        suggestion = 'This is a fair exchange!';
      }

      // Debug logs
      console.log('Debug Data:', {
        skillA: skillA.name,
        skillB: skillB.name,
        categoryA: skillA.Category.name,
        categoryB: skillB.Category.name,
        weightA: weightA.weight,
        weightB: weightB.weight,
        valueA,
        valueB,
        ratio
      });

      return {
        skillA: {
          name: skillA.name,
          category: skillA.Category.name,
          level: levelA,
          hours: hoursA,
          weight: parseFloat(weightA.weight),
          value: valueA
        },
        skillB: {
          name: skillB.name,
          category: skillB.Category.name,
          level: levelB,
          hours: hoursB,
          weight: parseFloat(weightB.weight),
          value: valueB
        },
        ratio: ratio,
        isFair: isFair,
        suggestion: suggestion,
        fairHoursB: fairHoursB
      };

    } catch (error) {
      console.error('Error in calculateFairExchange:', error);
      throw error;
    }
  }

  async getDefaultWeights() {
    return {
      "Programming": {
        "beginner": 1.0,
        "intermediate": 1.5,
        "advanced": 2.0
      },
      "Design": {
        "beginner": 1.0,
        "intermediate": 1.4,
        "advanced": 1.8
      },
      "Music": {
        "beginner": 1.0,
        "intermediate": 1.3,
        "advanced": 1.6
      },
      "Language": {
        "beginner": 1.0,
        "intermediate": 1.2,
        "advanced": 1.5
      },
      "Cooking": {
        "beginner": 1.0,
        "intermediate": 1.2,
        "advanced": 1.4
      },
      "Fitness": {
        "beginner": 1.0,
        "intermediate": 1.1,
        "advanced": 1.3
      }
    };
  }
}

module.exports = new CalculatorService();