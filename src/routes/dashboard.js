const express = require('express');
const router = express.Router();
const { User, Listing, LearningSession, Rating, UserSkill, Skill, TipToken, Category, Notification } = require('../models');
const { Op } = require('sequelize');

// Helper: Get date N days ago
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}

// User Dashboard
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        // ===== User Stats =====
        let sessionsAsTeacher = 0, sessionsAsStudent = 0, completedSessions = 0, upcomingSessions = 0;
        try {
            sessionsAsTeacher = await LearningSession.count({ where: { teacherId: userId } }) || 0;
            sessionsAsStudent = await LearningSession.count({ where: { studentId: userId } }) || 0;
            completedSessions = await LearningSession.count({
                where: {
                    [Op.or]: [{ teacherId: userId }, { studentId: userId }],
                    status: 'completed'
                }
            }) || 0;
            upcomingSessions = await LearningSession.count({
                where: {
                    [Op.or]: [{ teacherId: userId }, { studentId: userId }],
                    status: 'scheduled',
                    startAt: { [Op.gte]: now }
                }
            }) || 0;
        } catch (e) { console.log('Session count error:', e.message); }

        // My listings
        let myListings = 0, activeListings = 0;
        try {
            myListings = await Listing.count({ where: { userId } }) || 0;
            activeListings = await Listing.count({ where: { userId, status: 'approved' } }) || 0;
        } catch (e) { console.log('Listing count error:', e.message); }

        // My skills
        let teachingSkills = 0, learningSkills = 0;
        try {
            teachingSkills = await UserSkill.count({ where: { userId, type: 'teach' } }) || 0;
            learningSkills = await UserSkill.count({ where: { userId, type: 'learn' } }) || 0;
        } catch (e) { console.log('Skill count error:', e.message); }

        // My ratings
        let averageRating = 0, ratingsCount = 0;
        try {
            const ratingsReceived = await Rating.findAll({
                where: { rateeId: userId },
                attributes: ['communication', 'skill', 'attitude', 'punctuality']
            });
            ratingsCount = ratingsReceived.length;
            if (ratingsReceived.length > 0) {
                const total = ratingsReceived.reduce((sum, r) => {
                    return sum + (r.communication + r.skill + r.attitude + r.punctuality) / 4;
                }, 0);
                averageRating = (total / ratingsReceived.length).toFixed(1);
            }
        } catch (e) { console.log('Rating error:', e.message); }

        // Tips
        let tipsReceived = 0, tipsSent = 0;
        try {
            tipsReceived = await TipToken.sum('amount', { where: { toUserId: userId } }) || 0;
            tipsSent = await TipToken.sum('amount', { where: { fromUserId: userId } }) || 0;
        } catch (e) { console.log('Tips error:', e.message); }

        // Unread notifications
        let unreadNotifications = 0;
        try {
            unreadNotifications = await Notification.count({
                where: { user_id: userId, status: 'unread' }
            }) || 0;
        } catch (e) { console.log('Notification error:', e.message); }

        const stats = {
            sessionsAsTeacher,
            sessionsAsStudent,
            totalSessions: sessionsAsTeacher + sessionsAsStudent,
            completedSessions,
            upcomingSessions,
            myListings,
            activeListings,
            teachingSkills,
            learningSkills,
            averageRating,
            ratingsCount,
            tipsReceived,
            tipsSent,
            unreadNotifications
        };

        // ===== Recent Sessions =====
        let recentSessions = [];
        try {
            recentSessions = await LearningSession.findAll({
                where: {
                    [Op.or]: [{ teacherId: userId }, { studentId: userId }]
                },
                include: [
                    { model: User, as: 'teacher', attributes: ['id', 'name'] },
                    { model: User, as: 'student', attributes: ['id', 'name'] },
                    { model: Skill, attributes: ['id', 'name'] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 5
            });
        } catch (e) { console.log('Recent sessions error:', e.message); }

        // ===== My Skills List =====
        let mySkills = [];
        try {
            mySkills = await UserSkill.findAll({
                where: { userId },
                include: [{
                    model: Skill,
                    as: 'Skill',
                    include: [{ model: Category, as: 'Category', attributes: ['name'] }]
                }],
                limit: 10
            });
        } catch (e) { console.log('My skills error:', e.message); }

        // ===== Upcoming Sessions Detail =====
        let upcomingSessionsList = [];
        try {
            upcomingSessionsList = await LearningSession.findAll({
                where: {
                    [Op.or]: [{ teacherId: userId }, { studentId: userId }],
                    status: 'scheduled',
                    startAt: { [Op.gte]: now }
                },
                include: [
                    { model: User, as: 'teacher', attributes: ['id', 'name'] },
                    { model: User, as: 'student', attributes: ['id', 'name'] },
                    { model: Skill, attributes: ['id', 'name'] }
                ],
                order: [['startAt', 'ASC']],
                limit: 5
            });
        } catch (e) { console.log('Upcoming sessions error:', e.message); }

        // ===== Session Activity (last 7 days) =====
        const sessionActivity = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = daysAgo(i);
            const dayEnd = daysAgo(i - 1);
            let count = 0;
            try {
                count = await LearningSession.count({
                    where: {
                        [Op.or]: [{ teacherId: userId }, { studentId: userId }],
                        createdAt: { [Op.gte]: dayStart, [Op.lt]: dayEnd }
                    }
                }) || 0;
            } catch (e) { }
            sessionActivity.push({
                date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
                count
            });
        }

        res.render('dashboard', {
            title: 'My Dashboard - SkillSwap MY',
            stats,
            recentSessions,
            mySkills,
            upcomingSessionsList,
            sessionActivity: JSON.stringify(sessionActivity)
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Error loading dashboard.');
        res.redirect('/profile');
    }
});

module.exports = router;

