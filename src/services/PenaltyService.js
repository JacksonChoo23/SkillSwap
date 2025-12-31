// src/services/PenaltyService.js
const { User, Notification } = require('../models');

/**
 * Penalty configuration based on severity levels
 */
const PENALTY_CONFIG = {
    low: {
        action: 'warning',
        description: 'Warning issued',
        suspensionDays: 0
    },
    medium: {
        action: 'suspension',
        description: '3-day suspension',
        suspensionDays: 3
    },
    high: {
        action: 'suspension',
        description: '7-day suspension with content removal',
        suspensionDays: 7
    },
    critical: {
        action: 'ban',
        description: 'Permanent ban',
        suspensionDays: null // Permanent
    }
};

/**
 * Apply a penalty to a user based on severity
 * @param {number} userId - Target user ID
 * @param {string} severity - Severity level (low, medium, high, critical)
 * @param {string} reason - Reason for the penalty
 * @param {number} reportId - Associated report ID
 * @param {Server} io - Socket.io instance for real-time alerts
 * @returns {Object} Result of the penalty application
 */
async function applyPenalty(userId, severity, reason, reportId = null, io = null) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const config = PENALTY_CONFIG[severity];
        if (!config) {
            throw new Error(`Invalid severity level: ${severity}`);
        }

        let penaltyResult = {
            success: true,
            action: config.action,
            description: config.description,
            userId,
            severity
        };

        const emitForceLogout = (type, message) => {
            if (io) {
                io.to(`user_${userId}`).emit('force_logout', {
                    type: type,
                    title: 'Account Action',
                    message: message,
                    reason: reason
                });
            }
        };

        switch (config.action) {
            case 'warning':
                // Increment warning count
                await user.update({
                    warningCount: user.warningCount + 1
                });
                penaltyResult.message = `Warning issued. Total warnings: ${user.warningCount + 1}`;

                // Auto-escalate if too many warnings (3 warnings = suspension)
                if (user.warningCount + 1 >= 3) {
                    return applyPenalty(userId, 'medium', 'Automatic escalation due to multiple warnings', reportId, io);
                }
                break;

            case 'suspension':
                const suspensionEndDate = new Date();
                suspensionEndDate.setDate(suspensionEndDate.getDate() + config.suspensionDays);

                await user.update({
                    isSuspended: true,
                    suspensionEndDate,
                    suspensionReason: reason
                });
                penaltyResult.message = `Suspended until ${suspensionEndDate.toLocaleDateString()}`;
                penaltyResult.suspensionEndDate = suspensionEndDate;

                emitForceLogout('suspended', `Your account has been suspended until ${suspensionEndDate.toLocaleDateString()}.`);
                break;

            case 'ban':
                await user.update({
                    isBanned: true,
                    isSuspended: true,
                    suspensionReason: reason
                });
                penaltyResult.message = 'Account permanently banned';

                emitForceLogout('banned', 'Your account has been permanently banned.');
                break;

            default:
                throw new Error(`Unknown action: ${config.action}`);
        }

        // Create notification for the user
        await createPenaltyNotification(userId, config.action, reason, penaltyResult.message);

        return penaltyResult;
    } catch (error) {
        console.error('Penalty application error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create a notification for the penalized user
 */
async function createPenaltyNotification(userId, action, reason, details) {
    try {
        const titles = {
            warning: 'Account Warning',
            suspension: 'Account Suspended',
            ban: 'Account Banned'
        };

        const messages = {
            warning: `Your account has received a warning due to: ${reason}. Please review our community guidelines.`,
            suspension: `Your account has been suspended due to: ${reason}. ${details}`,
            ban: `Your account has been permanently banned due to: ${reason}. If you believe this is an error, please contact support.`
        };

        await Notification.create({
            user_id: userId,
            title: titles[action] || 'Account Action',
            message: messages[action] || details,
            status: 'unread'
        });
    } catch (error) {
        console.error('Failed to create penalty notification:', error);
    }
}

/**
 * Check if a user is currently suspended and lift suspension if expired
 * @param {User} user - User model instance
 * @returns {boolean} True if user is currently suspended/banned
 */
async function checkSuspensionStatus(user) {
    if (user.isBanned) {
        return true; // Permanently banned
    }

    if (user.isSuspended && user.suspensionEndDate) {
        const now = new Date();
        if (now > user.suspensionEndDate) {
            // Suspension expired, lift it
            await user.update({
                isSuspended: false,
                suspensionEndDate: null,
                suspensionReason: null
            });
            return false;
        }
        return true; // Still suspended
    }

    return false;
}

/**
 * Get penalty recommendation based on violation category and history
 * @param {string} category - Violation category from AI
 * @param {User} user - User model instance
 * @returns {string} Recommended severity level
 */
function getRecommendedSeverity(category, user) {
    // Base severity by category
    const categorySeverity = {
        'spam': 'low',
        'irrelevant_content': 'low',
        'mild_harassment': 'low',
        'harassment': 'medium',
        'inappropriate_language': 'medium',
        'scam_attempt': 'high',
        'hate_speech': 'high',
        'threats': 'critical',
        'illegal_content': 'critical',
        'child_safety': 'critical'
    };

    let severity = categorySeverity[category] || 'low';

    // Escalate based on warning history
    if (user && user.warningCount >= 2) {
        const severityOrder = ['low', 'medium', 'high', 'critical'];
        const currentIndex = severityOrder.indexOf(severity);
        if (currentIndex < severityOrder.length - 1) {
            severity = severityOrder[currentIndex + 1];
        }
    }

    return severity;
}

/**
 * Get display information for penalty
 */
function getPenaltyDisplay(severity) {
    const config = PENALTY_CONFIG[severity];
    if (!config) return null;

    return {
        severity,
        action: config.action,
        description: config.description,
        icon: severity === 'critical' ? 'ban' : severity === 'high' ? 'exclamation-triangle' : severity === 'medium' ? 'clock' : 'info-circle',
        color: severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : severity === 'medium' ? 'warning' : 'info'
    };
}

module.exports = {
    applyPenalty,
    checkSuspensionStatus,
    getRecommendedSeverity,
    getPenaltyDisplay,
    PENALTY_CONFIG
};
