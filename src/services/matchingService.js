const { User, UserSkill, Availability, Skill, Category, Rating } = require('../models');
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

      // Fetch full details for scoring, including receivedRatings for rating score
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
          },
          {
            model: Rating,
            as: 'receivedRatings',
            required: false
          }
        ]
      });

      const matches = [];

      for (const match of candidates) {
        const matchTeachSkills = match.userSkills.filter(us => us.type === 'teach').map(us => us.skillId);
        const matchLearnSkills = match.userSkills.filter(us => us.type === 'learn').map(us => us.skillId);

        // Calculate tag overlap score (Skills) - Weight: 40%
        const teachOverlap = teachSkills.filter(skillId => matchLearnSkills.includes(skillId)).length;
        const learnOverlap = learnSkills.filter(skillId => matchTeachSkills.includes(skillId)).length;
        const totalOverlap = teachOverlap + learnOverlap;
        const maxPossibleOverlap = Math.max(teachSkills.length, learnSkills.length) + Math.max(matchTeachSkills.length, matchLearnSkills.length);
        const tagOverlapScore = maxPossibleOverlap > 0 ? totalOverlap / maxPossibleOverlap : 0;

        // Calculate location score - Weight: 20%
        // Exact case-insensitive match = 1.0, otherwise 0
        const locationScore = this.calculateLocationScore(user.location, match.location);

        // Calculate rating score - Weight: 20%
        // avgRating / 5, default 0.5 for unrated users to not penalize new users
        const ratingScore = this.calculateRatingScore(match.receivedRatings);

        // Calculate availability overlap score - Weight: 20%
        const availabilityOverlapScore = this.calculateAvailabilityOverlap(user.availabilities, match.availabilities);

        // Calculate final score with new weights:
        // Skills (40%) + Location (20%) + Rating (20%) + Availability (20%)
        const finalScore = (tagOverlapScore * 0.4) + (locationScore * 0.2) + (ratingScore * 0.2) + (availabilityOverlapScore * 0.2);

        if (finalScore > 0) {
          // Get teach skills with names for session request modal
          const matchTeachSkillsWithNames = match.userSkills
            .filter(us => us.type === 'teach' && us.Skill)
            .map(us => ({ id: us.Skill.id, name: us.Skill.name }));

          matches.push({
            user: match,
            score: finalScore,
            tagOverlapScore,
            locationScore,
            ratingScore,
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

  /**
   * Calculate location match score.
   * Returns 1.0 if locations match (case-insensitive), 0 otherwise.
   * If either location is null/empty, returns 0.
   */
  calculateLocationScore(userLocation, matchLocation) {
    if (!userLocation || !matchLocation) {
      return 0;
    }
    // Case-insensitive comparison, trim whitespace
    const normalizedUserLoc = userLocation.trim().toLowerCase();
    const normalizedMatchLoc = matchLocation.trim().toLowerCase();
    return normalizedUserLoc === normalizedMatchLoc ? 1.0 : 0;
  }

  /**
   * Calculate rating score based on received ratings.
   * Returns avgRating / 5 (normalized to 0-1 range).
   * If no ratings, returns 0.5 (neutral) to not penalize new users.
   */
  calculateRatingScore(receivedRatings) {
    if (!receivedRatings || receivedRatings.length === 0) {
      return 0.5; // Neutral score for unrated users
    }

    // Calculate average rating across all rating dimensions
    let totalRatingSum = 0;
    let ratingCount = 0;

    for (const rating of receivedRatings) {
      // Each rating has: communication, skill, attitude, punctuality (each 1-5)
      const ratingAvg = (rating.communication + rating.skill + rating.attitude + rating.punctuality) / 4;
      totalRatingSum += ratingAvg;
      ratingCount++;
    }

    const avgRating = totalRatingSum / ratingCount;
    // Normalize to 0-1 scale (5 stars = 1.0, 4 stars = 0.8, etc.)
    return avgRating / 5;
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