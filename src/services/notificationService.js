// src/services/notificationService.js
const { Notification, User } = require('../models');
const { sendNotificationEmail } = require('../../utils/mailer');

/**
 * Create a notification and optionally send an email.
 * @param {Object} options
 * @param {number} options.userId - User ID to notify
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {boolean} [options.sendEmail=true] - Whether to also send an email
 * @returns {Promise<Object>} The created notification
 */
async function createNotification({ userId, title, message, sendEmail = true }) {
    try {
        // Create the in-app notification
        const notification = await Notification.create({
            user_id: userId,
            title,
            message,
            status: 'unread'
        });

        // Send email if enabled
        if (sendEmail) {
            try {
                const user = await User.findByPk(userId, { attributes: ['email', 'name'] });
                if (user && user.email) {
                    await sendNotificationEmail({
                        to: user.email,
                        name: user.name,
                        title,
                        message
                    });
                }
            } catch (emailErr) {
                console.error('[NotificationService] Email send failed:', emailErr.message);
                // Don't throw - email failure shouldn't break the flow
            }
        }

        return notification;
    } catch (error) {
        console.error('[NotificationService] Create notification failed:', error.message);
        throw error;
    }
}

/**
 * Create a notification for a user by email (looks up user first).
 * @param {Object} options
 * @param {string} options.userEmail - User email to notify
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {boolean} [options.sendEmail=true] - Whether to also send an email
 * @returns {Promise<Object|null>} The created notification or null if user not found
 */
async function notifyByEmail({ userEmail, title, message, sendEmail = true }) {
    const user = await User.findOne({ where: { email: userEmail }, attributes: ['id', 'name', 'email'] });
    if (!user) {
        console.warn(`[NotificationService] User not found for email: ${userEmail}`);
        return null;
    }
    return createNotification({ userId: user.id, title, message, sendEmail });
}

module.exports = {
    createNotification,
    notifyByEmail
};
