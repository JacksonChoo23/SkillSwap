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

      // Optimization: Filter candidates at the database level
      // We only want users who:
      // 1. Learn what I teach (their 'learn' skills include my 'teach' skills)
      // OR
      // 2. Teach what I learn (their 'teach' skills include my 'learn' skills)

      const matchingUserIds = (await User.findAll({
        attributes: ['id'],
        where: {
          id: { [Op.ne]: userId },
          isPublic: true,
          role: 'user'
        },
        include: [{
          model: UserSkill,
          as: 'userSkills',
          required: true,
          where: {
            [Op.or]: [
              { type: 'learn', skillId: { [Op.in]: teachSkills.length ? teachSkills : [-1] } },
              { type: 'teach', skillId: { [Op.in]: learnSkills.length ? learnSkills : [-1] } }
            ]
          }
        }]
      })).map(u => u.id);

      // Remove duplicates
      const uniqueMatchingIds = [...new Set(matchingUserIds)];

      if (uniqueMatchingIds.length === 0) {
        return [];
      }

      // Fetch full details for scoring
      const candidates = await User.findAll({
        where: { id: { [Op.in]: uniqueMatchingIds } },
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

      for (const match of candidates) {
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
          // Get teach skills with names for session request modal
          const matchTeachSkillsWithNames = match.userSkills
            .filter(us => us.type === 'teach' && us.Skill)
            .map(us => ({ id: us.Skill.id, name: us.Skill.name }));

          matches.push({
            user: match,
            score: finalScore,
            tagOverlapScore,
            availabilityOverlapScore,
            teachOverlap,
            learnOverlap,
            teachSkills: matchTeachSkillsWithNames
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