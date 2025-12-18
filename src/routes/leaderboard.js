const express = require('express');
const { User, UserProgress } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// Leaderboard page
router.get('/', async (req, res) => {
    try {
        // Aggregate points by user
        const leaderboardData = await UserProgress.findAll({
            attributes: [
                'userId',
                [sequelize.fn('SUM', sequelize.col('points')), 'totalPoints'],
                [sequelize.fn('SUM', sequelize.literal("CASE WHEN type = 'teach' THEN points ELSE 0 END")), 'teachPoints'],
                [sequelize.fn('SUM', sequelize.literal("CASE WHEN type = 'learn' THEN points ELSE 0 END")), 'learnPoints']
            ],
            group: ['userId'],
            order: [[sequelize.literal('totalPoints'), 'DESC']],
            limit: 20,
            raw: true
        });

        // Get user details for each entry
        const userIds = leaderboardData.map(entry => entry.userId);
        const users = await User.findAll({
            where: { id: userIds, isPublic: true },
            attributes: ['id', 'name', 'profileImage', 'location']
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        const leaderboard = leaderboardData
            .filter(entry => userMap.has(entry.userId))
            .map((entry, index) => ({
                rank: index + 1,
                user: userMap.get(entry.userId),
                totalPoints: parseInt(entry.totalPoints) || 0,
                teachPoints: parseInt(entry.teachPoints) || 0,
                learnPoints: parseInt(entry.learnPoints) || 0
            }));

        res.render('leaderboard/index', {
            title: 'Leaderboard - SkillSwap MY',
            leaderboard
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        req.session.error = 'Error loading leaderboard.';
        res.redirect('/');
    }
});

module.exports = router;
