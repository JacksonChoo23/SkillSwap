const { User, UserSkill, Availability, Skill, Category } = require('../models');
const { Op } = require('sequelize');

class MatchingService {
  async findMatches(userId, limit = 20) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: UserSkill,
            as: 'userSkills',
            include: [{ model: Skill, include: [Category] }]
          },
          {
            model: Availability,
            as: 'availabilities'
          }
        ]
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's teach and learn skills
      const teachSkills = user.userSkills.filter(us => us.type === 'teach').map(us => us.skillId);
      const learnSkills = user.userSkills.filter(us => us.type === 'learn').map(us => us.skillId);

      // Find potential matches
      const potentialMatches = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
          isPublic: true,
          role: 'user'
        },
        include: [
          {
            model: UserSkill,
            as: 'userSkills',
            include: [{ model: Skill, include: [Category] }]
          },
          {
            model: Availability,
            as: 'availabilities'
          }
        ]
      });

      const matches = [];

      for (const match of potentialMatches) {
        const matchTeachSkills = match.userSkills.filter(us => us.type === 'teach').map(us => us.skillId);
        const matchLearnSkills = match.userSkills.filter(us => us.type === 'learn').map(us => us.skillId);

        // Calculate tag overlap score
        const teachOverlap = teachSkills.filter(skillId => matchLearnSkills.includes(skillId)).length;
        const learnOverlap = learnSkills.filter(skillId => matchTeachSkills.includes(skillId)).length;
        const totalOverlap = teachOverlap + learnOverlap;
        const maxPossibleOverlap = Math.max(teachSkills.length, learnSkills.length) + Math.max(matchTeachSkills.length, matchLearnSkills.length);
        const tagOverlapScore = maxPossibleOverlap > 0 ? totalOverlap / maxPossibleOverlap : 0;

        // Calculate availability overlap score
        const availabilityOverlapScore = this.calculateAvailabilityOverlap(user.availabilities, match.availabilities);

        // Calculate final score
        const finalScore = (tagOverlapScore * 0.6) + (availabilityOverlapScore * 0.4);

        if (finalScore > 0) {
          matches.push({
            user: match,
            score: finalScore,
            tagOverlapScore,
            availabilityOverlapScore,
            teachOverlap,
            learnOverlap
          });
        }
      }

      // Sort by score and return top matches
      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Error in findMatches:', error);
      throw error;
    }
  }

  calculateAvailabilityOverlap(userAvailabilities, matchAvailabilities) {
    if (!userAvailabilities.length || !matchAvailabilities.length) {
      return 0;
    }

    let overlapCount = 0;
    let totalPossibleOverlaps = 0;

    for (const userAvail of userAvailabilities) {
      for (const matchAvail of matchAvailabilities) {
        if (userAvail.dayOfWeek === matchAvail.dayOfWeek) {
          totalPossibleOverlaps++;
          
          // Check if time slots overlap
          const userStart = userAvail.startTime;
          const userEnd = userAvail.endTime;
          const matchStart = matchAvail.startTime;
          const matchEnd = matchAvail.endTime;

          if (userStart < matchEnd && userEnd > matchStart) {
            overlapCount++;
          }
        }
      }
    }

    return totalPossibleOverlaps > 0 ? overlapCount / totalPossibleOverlaps : 0;
  }
}

module.exports = new MatchingService(); 