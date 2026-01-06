const express = require('express');
const { User, Listing, Report, Category, Skill, CalculatorWeight, Notification, LearningSession, Transaction, Invoice, TipToken } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { checkGeminiHealth } = require('../../utils/geminiModeration');
const { sendNotificationEmail } = require('../../utils/mailer');
const { createNotification } = require('../services/notificationService');


const router = express.Router();

// Helper function to get pagination params
function getPagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(3, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Helper function to build pagination data for views
function buildPaginationData(count, page, limit, baseUrl) {
  const totalPages = Math.ceil(count / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems: count,
    limit,
    baseUrl
  };
}

// Helper: Get date N days ago
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Admin dashboard (Advanced)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = daysAgo(30);
    const sixtyDaysAgo = daysAgo(60);

    // ===== KPI Stats =====
    const totalUsers = await User.count({ where: { role: 'user' } });
    const usersLastMonth = await User.count({
      where: { role: 'user', createdAt: { [Op.gte]: thirtyDaysAgo } }
    });
    const usersPrevMonth = await User.count({
      where: { role: 'user', createdAt: { [Op.gte]: sixtyDaysAgo, [Op.lt]: thirtyDaysAgo } }
    });

    const totalListings = await Listing.count();
    const listingsLastMonth = await Listing.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } }
    });

    const totalSessions = await LearningSession.count();
    const completedSessions = await LearningSession.count({ where: { status: 'completed' } });

    const openReports = await Report.count({ where: { status: { [Op.in]: ['pending_ai', 'ai_reviewed', 'escalated'] } } });

    // Categories and Skills count
    const totalCategories = await Category.count({ where: { isActive: true } });
    const totalSkills = await Skill.count();

    // Payments count and Revenue
    let totalRevenue = 0;
    let totalPayments = 0;
    try {
      const revenueResult = await Transaction.sum('amount', { where: { status: 'succeeded' } });
      totalRevenue = revenueResult || 0;
      totalPayments = await Transaction.count();
    } catch (e) { /* Transaction model may not exist yet */ }

    const stats = {
      totalUsers,
      usersLastMonth,
      userGrowth: usersPrevMonth > 0 ? Math.round(((usersLastMonth - usersPrevMonth) / usersPrevMonth) * 100) : 100,
      totalListings,
      listingsLastMonth,
      totalCategories,
      totalSkills,
      totalPayments,
      openReports,
      totalRevenue
    };

    // ===== Chart Data: User Growth (last 30 days) =====
    const userGrowthData = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = daysAgo(i);
      const dayEnd = daysAgo(i - 1);
      const count = await User.count({
        where: { role: 'user', createdAt: { [Op.gte]: dayStart, [Op.lt]: dayEnd } }
      });
      userGrowthData.push({
        date: dayStart.toISOString().split('T')[0],
        count
      });
    }

    // ===== Chart Data: Category Distribution =====
    const categories = await Category.findAll({
      include: [{ model: Skill, as: 'skills', attributes: ['id'] }],
      where: { isActive: true }
    });
    const categoryDistribution = categories.map(c => ({
      name: c.name,
      count: c.skills ? c.skills.length : 0
    }));

    // ===== Chart Data: Session Status =====
    const sessionStatuses = ['scheduled', 'completed', 'cancelled'];
    const sessionStatusData = [];
    for (const status of sessionStatuses) {
      const count = await LearningSession.count({ where: { status } });
      sessionStatusData.push({ status, count });
    }

    // ===== Recent Activity Feed =====
    const recentUsers = await User.findAll({
      where: { role: 'user' },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'createdAt']
    });

    const recentListings = await Listing.findAll({
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const recentReports = await Report.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'targetUser', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Merge into unified feed
    const activityFeed = [
      ...recentUsers.map(u => ({ type: 'user', data: u, time: u.createdAt })),
      ...recentListings.map(l => ({ type: 'listing', data: l, time: l.createdAt })),
      ...recentReports.map(r => ({ type: 'report', data: r, time: r.createdAt }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    // ===== Top Teachers =====
    const topTeachers = await User.findAll({
      where: { role: 'user' },
      include: [{
        model: LearningSession,
        as: 'teachingSessions',
        where: { status: 'completed' },
        required: false
      }],
      order: [[{ model: LearningSession, as: 'teachingSessions' }, 'id', 'DESC']],
      limit: 5
    });

    // ===== AI Health Check =====
    let aiHealth;
    try {
      aiHealth = await checkGeminiHealth();
    } catch (healthError) {
      console.error('Health check error:', healthError);
      aiHealth = {
        online: false,
        message: 'Health check failed'
      };
    }

    res.render('admin/dashboard', {
      layout: 'layouts/admin',
      title: 'Admin Dashboard',
      stats,
      userGrowthData: JSON.stringify(userGrowthData),
      categoryDistribution: JSON.stringify(categoryDistribution),
      sessionStatusData: JSON.stringify(sessionStatusData),
      activityFeed,
      topTeachers,
      recentListings,
      recentReports,
      aiHealth
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error', 'Error loading admin dashboard.');
    res.redirect('/');
  }
});

// Users management - Enhanced with search, filter, and stats
router.get('/users', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, status } = req.query;

    // Build where clause for search and filter
    const whereClause = {}; // Show all users including admins

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status === 'active') {
      whereClause.isBanned = false;
      whereClause.isSuspended = false;
    } else if (status === 'suspended') {
      whereClause.isSuspended = true;
      whereClause.isBanned = false;
    } else if (status === 'banned') {
      whereClause.isBanned = true;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Fetch stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const [sessionCount, listingCount] = await Promise.all([
        LearningSession.count({
          where: {
            [Op.or]: [{ teacherId: user.id }, { studentId: user.id }]
          }
        }),
        Listing.count({ where: { userId: user.id } })
      ]);

      return {
        ...user.toJSON(),
        sessionCount,
        listingCount
      };
    }));

    // Build base URL with current filters for pagination
    let baseUrl = '/admin/users?';
    if (search) baseUrl += `search=${encodeURIComponent(search)}&`;
    if (status) baseUrl += `status=${status}&`;

    res.render('admin/users', {
      layout: 'layouts/admin',
      title: 'Manage Users',
      users: usersWithStats,
      search: search || '',
      status: status || '',
      ...buildPaginationData(count, page, limit, baseUrl)
    });
  } catch (error) {
    console.error('Users management error:', error);
    req.session.error = 'Error loading users.';
    res.redirect('/admin');
  }
});

// Create new user (from Add User modal)
router.post('/users/create', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate inputs
    if (!name || name.trim().length < 2) {
      req.flash('error', 'Name must be at least 2 characters long.');
      return res.redirect('/admin/users');
    }

    if (!email || !email.includes('@')) {
      req.flash('error', 'Please enter a valid email address.');
      return res.redirect('/admin/users');
    }

    if (!password || password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters long.');
      return res.redirect('/admin/users');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
      req.flash('error', 'A user with this email already exists.');
      return res.redirect('/admin/users');
    }

    // Validate role
    const validRoles = ['user', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: userRole,
      isVerified: true // Admin-created users are auto-verified
    });

    req.flash('success', `User "${name}" created successfully with role: ${userRole}`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Create user error:', error);
    req.flash('error', 'Error creating user.');
    res.redirect('/admin/users');
  }
});

// Delete user permanently
router.post('/users/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    // Prevent deleting admin users (extra safety)
    if (user.role === 'admin') {
      req.flash('error', 'Cannot delete admin users.');
      return res.redirect('/admin/users');
    }

    const userName = user.name;
    const userEmail = user.email;

    // Send notification email before deletion
    const deleteTitle = 'Account Deleted';
    const deleteMessage = `Your SkillSwap MY account has been permanently deleted by an administrator. All your data, including listings, sessions, and reports, have been removed from our system. If you believe this was done in error, please contact our support team.`;

    try {
      await sendNotificationEmail({
        to: userEmail,
        name: userName,
        title: deleteTitle,
        message: deleteMessage
      });
      console.log(`[ADMIN] Account deletion email sent to ${userEmail}`);
    } catch (emailErr) {
      console.error('[ADMIN] Failed to send deletion email:', emailErr.message);
      // Continue with deletion even if email fails
    }

    // Delete all related data first (cascading delete)
    // Delete user's listings
    await Listing.destroy({ where: { userId: id } });

    // Delete user's sessions (as teacher or student)
    await LearningSession.destroy({
      where: {
        [Op.or]: [{ teacherId: id }, { studentId: id }]
      }
    });

    // Delete user's reports (as reporter or target)
    await Report.destroy({
      where: {
        [Op.or]: [{ reporterId: id }, { targetUserId: id }]
      }
    });

    // Delete user's notifications
    await Notification.destroy({ where: { user_id: id } });

    // Finally delete the user
    await user.destroy();

    req.flash('success', `User "${userName}" has been permanently deleted.`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Delete user error:', error);
    req.flash('error', 'Error deleting user.');
    res.redirect('/admin/users');
  }
});

// Ban/unban user (permanent - use for manage users page)
router.post('/users/:id/toggle-ban', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      req.session.error = 'User not found.';
      return res.redirect('/admin/users');
    }

    if (user.role === 'admin') {
      req.session.error = 'Cannot ban admin users.';
      return res.redirect('/admin/users');
    }

    // Toggle ban status (permanent)
    const newBannedStatus = !user.isBanned;

    await user.update({
      isBanned: newBannedStatus
    });

    if (newBannedStatus) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${user.id}`).emit('force_logout', {
          type: 'banned',
          title: 'Account Action',
          message: 'Your account has been permanently banned.',
          reason: 'Administrator action'
        });
      }
    }

    req.session.success = `User ${newBannedStatus ? 'banned' : 'unbanned'} successfully.`;
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  } catch (error) {
    console.error('Toggle ban error:', error);
    req.session.error = 'Error updating user status.';
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  }
});

// Suspend user with custom duration
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      req.session.error = 'User not found.';
      return res.redirect('/admin/users');
    }

    if (user.role === 'admin') {
      req.session.error = 'Cannot suspend admin users.';
      return res.redirect('/admin/users');
    }

    const suspensionDays = parseInt(days) || 7;
    const suspensionEndDate = new Date();
    suspensionEndDate.setDate(suspensionEndDate.getDate() + suspensionDays);

    await user.update({
      isSuspended: true,
      suspensionEndDate: suspensionEndDate,
      suspensionReason: `Suspended by administrator for ${suspensionDays} days`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user.id}`).emit('force_logout', {
        type: 'suspended',
        title: 'Account Action',
        message: `Your account has been suspended for ${suspensionDays} days. Suspension ends on ${suspensionEndDate.toLocaleDateString()}.`,
        reason: `Suspended by administrator for ${suspensionDays} days`
      });
    }

    // Send notification and email to user
    const suspendTitle = 'Account Suspended';
    const suspendMessage = `Your account has been suspended for ${suspensionDays} days. Suspension ends on ${suspensionEndDate.toLocaleDateString()}.`;
    try {
      await Notification.create({
        user_id: user.id,
        title: suspendTitle,
        message: suspendMessage,
        status: 'unread'
      });
      // Send email notification
      await sendNotificationEmail({ to: user.email, name: user.name, title: suspendTitle, message: suspendMessage });
    } catch (e) { console.error('Notification/Email error:', e); }

    req.session.success = `User suspended for ${suspensionDays} days.`;
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  } catch (error) {
    console.error('Suspend user error:', error);
    req.session.error = 'Error suspending user.';
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  }
});

// Unsuspend user
router.post('/users/:id/unsuspend', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      req.session.error = 'User not found.';
      return res.redirect('/admin/users');
    }

    await user.update({
      isSuspended: false,
      suspensionEndDate: null,
      suspensionReason: null,
      warningCount: 0
    });

    // Send notification and email to user
    const unsuspendTitle = 'Suspension Lifted';
    const unsuspendMessage = 'Your account suspension has been lifted. You can now use the platform normally.';
    try {
      await Notification.create({
        user_id: user.id,
        title: unsuspendTitle,
        message: unsuspendMessage,
        status: 'unread'
      });
      // Send email notification
      await sendNotificationEmail({ to: user.email, name: user.name, title: unsuspendTitle, message: unsuspendMessage });
    } catch (e) { console.error('Notification/Email error:', e); }

    req.session.success = 'User unsuspended successfully.';
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  } catch (error) {
    console.error('Unsuspend user error:', error);
    req.session.error = 'Error unsuspending user.';
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  }
});

// Send warning to user
router.post('/users/:id/warn', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      req.session.error = 'User not found.';
      return res.redirect('/admin/users');
    }

    const newWarningCount = (user.warningCount || 0) + 1;

    // Increment warning count
    await user.update({
      warningCount: newWarningCount
    });

    // Send warning notification and email with dynamic message based on warning count
    const warnTitle = `Official Warning (${newWarningCount} of 3)`;
    let warnMessage = message || 'You have received an official warning for violating community guidelines.';

    // Add specific consequences based on warning count
    if (newWarningCount === 1) {
      warnMessage += ' This is your first warning. Please review our community guidelines to avoid further violations.';
    } else if (newWarningCount === 2) {
      warnMessage += ' This is your second warning. One more warning will mark your account as high-risk.';
    } else if (newWarningCount === 3) {
      warnMessage += ' This is your third warning. Your account is now marked as HIGH-RISK and visible to other users. Any additional violations will result in automatic account suspension.';
    }

    await Notification.create({
      user_id: user.id,
      title: warnTitle,
      message: warnMessage,
      status: 'unread'
    });
    // Send email notification
    await sendNotificationEmail({ to: user.email, name: user.name, title: warnTitle, message: warnMessage });

    // Auto-suspend if warning count exceeds 3
    if (newWarningCount > 3) {
      const suspensionDays = 3;
      const suspensionEndDate = new Date();
      suspensionEndDate.setDate(suspensionEndDate.getDate() + suspensionDays);

      await user.update({
        isSuspended: true,
        suspensionEndDate: suspensionEndDate,
        suspensionReason: `Automatic suspension due to ${newWarningCount} warnings`
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${user.id}`).emit('force_logout', {
          type: 'suspended',
          title: 'Account Action',
          message: `Your account has been automatically suspended for ${suspensionDays} days due to receiving ${newWarningCount} warnings.`,
          reason: `Automatic suspension due to ${newWarningCount} warnings`
        });
      }

      // Send suspension notification and email
      const suspendTitle = 'Account Suspended';
      const suspendMessage = `Your account has been automatically suspended for ${suspensionDays} days due to receiving ${newWarningCount} warnings. Suspension ends on ${suspensionEndDate.toLocaleDateString()}.`;
      await Notification.create({
        user_id: user.id,
        title: suspendTitle,
        message: suspendMessage,
        status: 'unread'
      });
      await sendNotificationEmail({ to: user.email, name: user.name, title: suspendTitle, message: suspendMessage });

      req.session.success = `Warning sent to ${user.name}. Total warnings: ${newWarningCount}. User has been automatically suspended for 3 days.`;
    } else {
      req.session.success = `Warning sent to ${user.name}. Total warnings: ${newWarningCount}.`;
    }

    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  } catch (error) {
    console.error('Warn user error:', error);
    req.session.error = 'Error sending warning.';
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/users');
  }
});

// Get user details (for modal)
router.get('/users/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash', 'resetToken', 'resetTokenExpiry', 'activationToken'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [sessionCount, listingCount, completedSessions] = await Promise.all([
      LearningSession.count({ where: { [Op.or]: [{ teacherId: id }, { studentId: id }] } }),
      Listing.count({ where: { userId: id } }),
      LearningSession.count({ where: { [Op.or]: [{ teacherId: id }, { studentId: id }], status: 'completed' } })
    ]);

    res.json({
      ...user.toJSON(),
      stats: {
        sessionCount,
        listingCount,
        completedSessions
      }
    });
  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});


router.get('/listings', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, status } = req.query;

    // Build where clause
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    // Build include with search condition
    const includeClause = [{
      model: User,
      attributes: ['id', 'name'],
      ...(search ? { where: { name: { [Op.like]: `%${search}%` } }, required: false } : {})
    }];

    // If searching, also search by title
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: listings } = await Listing.findAndCountAll({
      where: whereClause,
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Filter by owner name in JS if search provided (since Sequelize OR across include is complex)
    let filteredListings = listings;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredListings = listings.filter(l =>
        l.title.toLowerCase().includes(searchLower) ||
        (l.User?.name && l.User.name.toLowerCase().includes(searchLower))
      );
    }

    // Build base URL with current filters
    let baseUrl = '/admin/listings?';
    if (search) baseUrl += `search=${encodeURIComponent(search)}&`;
    if (status) baseUrl += `status=${status}&`;

    const pagination = buildPaginationData(count, page, limit, baseUrl);
    res.render('admin/listings', {
      layout: 'layouts/admin',
      title: 'Manage Listings',
      listings: filteredListings,
      search: search || '',
      status: status || '',
      currentUrl: req.originalUrl,
      ...pagination
    });
  } catch (error) {
    console.error('Listings management error:', error);
    req.session.error = 'Error loading listings.';
    res.redirect('/admin');
  }
});

// Activate/Close listing
router.post('/listings/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;

    if (!['activate', 'close', 'pause'].includes(action)) {
      req.session.error = 'Invalid action.';
      return res.redirect('/admin/listings');
    }

    const listing = await Listing.findByPk(id, {
      include: [{ model: User, attributes: ['id', 'name'] }]
    });
    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/admin/listings');
    }

    // Map action to status: activate -> active, close -> closed, pause -> paused
    const statusMap = { activate: 'active', close: 'closed', pause: 'paused' };
    await listing.update({ status: statusMap[action] });

    // Notify listing owner
    try {
      const actionText = { activate: 'activated', close: 'closed', pause: 'paused' };
      await Notification.create({
        user_id: listing.userId,
        title: `Listing ${actionText[action]}`,
        message: `Your listing "${listing.title}" has been ${actionText[action]} by an administrator.`,
        status: 'unread'
      });
    } catch (e) { console.error('Notify listing action error:', e); }

    req.session.success = `Listing ${action}d successfully.`;
    res.redirect(req.header('Referer') || '/admin/listings');
  } catch (error) {
    console.error('Listing action error:', error);
    req.session.error = 'Error updating listing status.';
    res.redirect(req.header('Referer') || '/admin/listings');
  }
});

// Reports management
router.get('/reports', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, status } = req.query;

    // Build where clause
    const whereClause = {};
    if (status) {
      // 'resolved' filter includes both 'resolved' and 'auto_penalized'
      if (status === 'resolved') {
        whereClause.status = { [Op.in]: ['resolved', 'auto_penalized'] };
      } else {
        whereClause.status = status;
      }
    }

    const { count, rows: reports } = await Report.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'targetUser', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Filter by reporter/target name in JS if search provided
    let filteredReports = reports;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredReports = reports.filter(r =>
        (r.reporter?.name && r.reporter.name.toLowerCase().includes(searchLower)) ||
        (r.targetUser?.name && r.targetUser.name.toLowerCase().includes(searchLower))
      );
    }

    // Build base URL with current filters
    let baseUrl = '/admin/reports?';
    if (search) baseUrl += `search=${encodeURIComponent(search)}&`;
    if (status) baseUrl += `status=${status}&`;

    res.render('admin/reports', {
      layout: 'layouts/admin',
      title: 'Manage Reports',
      reports: filteredReports,
      search: search || '',
      status: status || '',
      ...buildPaginationData(count, page, limit, baseUrl)
    });
  } catch (error) {
    console.error('Reports management error:', error);
    req.session.error = 'Error loading reports.';
    res.redirect('/admin');
  }
});

// Resolve report
router.post('/reports/:id/close', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByPk(id);
    if (!report) {
      req.session.error = 'Report not found.';
      return res.redirect('/admin/reports');
    }

    await report.update({ status: 'resolved' });

    req.session.success = 'Report marked as resolved.';
    res.redirect(req.header('Referer') || '/admin/reports');
  } catch (error) {
    console.error('Resolve report error:', error);
    req.session.error = 'Error resolving report.';
    res.redirect(req.header('Referer') || '/admin/reports');
  }
});

// Admin action on report (warning, suspend, ban, dismiss)
router.post('/reports/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType, adminNotes } = req.body;

    const report = await Report.findByPk(id, {
      include: [{ model: User, as: 'targetUser' }]
    });

    if (!report) {
      req.session.error = 'Report not found.';
      return res.redirect('/admin/reports');
    }

    const validActions = ['warning', 'suspend_3', 'suspend_7', 'ban', 'dismiss'];
    if (!validActions.includes(actionType)) {
      req.session.error = 'Invalid action type.';
      return res.redirect('/admin/reports');
    }

    // Import PenaltyService
    const { applyPenalty } = require('../services/PenaltyService');

    let actionMessage = '';
    let penaltyResult = null;

    if (actionType === 'dismiss') {
      // Dismiss: mark as resolved without penalty
      await report.update({
        status: 'resolved',
        adminNotes: adminNotes || 'Report dismissed by admin - no violation found.'
      });
      actionMessage = 'Report dismissed successfully.';
    } else {
      // Apply penalty based on action type
      const severityMap = {
        'warning': 'low',
        'suspend_3': 'medium',
        'suspend_7': 'high',
        'ban': 'critical'
      };

      const severity = severityMap[actionType];
      const reason = adminNotes || report.reason || 'Admin action on report';

      penaltyResult = await applyPenalty(
        report.targetUserId,
        severity,
        reason,
        report.id,
        req.app.get('io')
      );

      await report.update({
        status: 'auto_penalized',
        severity: severity,
        penaltyApplied: penaltyResult.description || severity,
        adminNotes: `Admin action: ${actionType}. ${adminNotes || ''}`
      });

      actionMessage = penaltyResult.message || 'Penalty applied successfully.';
    }

    req.session.success = actionMessage;
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/reports');
  } catch (error) {
    console.error('Admin report action error:', error);
    req.session.error = 'Error applying action to report.';
    res.redirect(req.body.returnTo || req.header('Referer') || '/admin/reports');
  }
});

// Categories management
router.get('/categories', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, status } = req.query;

    // Build where clause
    const whereClause = {};
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    const { count, rows: categories } = await Category.findAndCountAll({
      where: whereClause,
      include: [{ model: Skill, as: 'skills', attributes: ['id', 'name', 'categoryId'] }],
      order: [['name', 'ASC']],
      limit,
      offset
    });

    // Build base URL with current filters
    let baseUrl = '/admin/categories?';
    if (search) baseUrl += `search=${encodeURIComponent(search)}&`;
    if (status) baseUrl += `status=${status}&`;

    res.render('admin/categories', {
      layout: 'layouts/admin',
      title: 'Manage Categories',
      categories,
      search: search || '',
      status: status || '',
      ...buildPaginationData(count, page, limit, baseUrl)
    });
  } catch (error) {
    console.error('Categories management error:', error);
    req.session.error = 'Error loading categories.';
    res.redirect('/admin');
  }
});

// Add category
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      req.session.error = 'Category name must be at least 2 characters long.';
      return res.redirect('/admin/categories');
    }

    await Category.create({ name: name.trim() });

    req.session.success = 'Category added successfully.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Add category error:', error);
    req.session.error = 'Error adding category.';
    res.redirect('/admin/categories');
  }
});

// Toggle category status
router.post('/categories/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      req.session.error = 'Category not found.';
      return res.redirect('/admin/categories');
    }

    await category.update({ isActive: !category.isActive });

    req.session.success = `Category ${category.isActive ? 'activated' : 'deactivated'} successfully.`;
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Toggle category error:', error);
    req.session.error = 'Error updating category status.';
    res.redirect('/admin/categories');
  }
});

// Update category
router.post('/categories/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      req.session.error = 'Category name must be at least 2 characters long.';
      return res.redirect('/admin/categories');
    }

    const category = await Category.findByPk(id);
    if (!category) {
      req.session.error = 'Category not found.';
      return res.redirect('/admin/categories');
    }

    await category.update({ name: name.trim() });

    req.session.success = 'Category updated successfully.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Update category error:', error);
    req.session.error = 'Error updating category.';
    res.redirect('/admin/categories');
  }
});

// Delete category
router.post('/categories/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [{ model: Skill, as: 'skills' }]
    });

    if (!category) {
      req.session.error = 'Category not found.';
      return res.redirect('/admin/categories');
    }

    // Delete associated skills first (or you could set categoryId to null if you want to keep skills)
    if (category.skills && category.skills.length > 0) {
      await Skill.destroy({ where: { categoryId: id } });
    }

    await category.destroy();

    req.session.success = 'Category deleted successfully.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Delete category error:', error);
    req.session.error = 'Error deleting category.';
    res.redirect('/admin/categories');
  }
});

// Add skill
router.post('/skills', async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name || name.trim().length < 2) {
      req.session.error = 'Skill name must be at least 2 characters long.';
      return res.redirect('/admin/categories');
    }

    if (!categoryId) {
      req.session.error = 'Please select a category.';
      return res.redirect('/admin/categories');
    }

    const category = await Category.findByPk(categoryId);
    if (!category) {
      req.session.error = 'Category not found.';
      return res.redirect('/admin/categories');
    }

    await Skill.create({
      name: name.trim(),
      categoryId: parseInt(categoryId, 10)
    });

    req.session.success = 'Skill added successfully.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Add skill error:', error);
    req.session.error = 'Error adding skill.';
    res.redirect('/admin/categories');
  }
});

// Update skill
router.post('/skills/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;

    if (!name || name.trim().length < 2) {
      req.session.error = 'Skill name must be at least 2 characters long.';
      return res.redirect('/admin/categories');
    }

    if (!categoryId) {
      req.session.error = 'Please select a category.';
      return res.redirect('/admin/categories');
    }

    const skill = await Skill.findByPk(id);
    if (!skill) {
      req.session.error = 'Skill not found.';
      return res.redirect('/admin/categories');
    }

    await skill.update({
      name: name.trim(),
      categoryId: parseInt(categoryId, 10)
    });

    req.session.success = 'Skill updated successfully.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Update skill error:', error);
    req.session.error = 'Error updating skill.';
    res.redirect('/admin/categories');
  }
});

// Delete skill
router.post('/skills/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;

    const skill = await Skill.findByPk(id);
    if (!skill) {
      req.session.error = 'Skill not found.';
      return res.redirect('/admin/categories');
    }

    await skill.destroy();

    req.session.success = 'Skill deleted successfully.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Delete skill error:', error);
    req.session.error = 'Error deleting skill.';
    res.redirect('/admin/categories');
  }
});

// Calculator weights management
router.get('/weights', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, level } = req.query;

    // Build where clause
    const whereClause = {};
    if (level) {
      whereClause.level = level;
    }

    // Build include clause with search
    const includeClause = {
      model: Category,
      attributes: ['id', 'name'],
      ...(search ? { where: { name: { [Op.like]: `%${search}%` } } } : {})
    };

    const { count, rows: weights } = await CalculatorWeight.findAndCountAll({
      where: whereClause,
      include: [includeClause],
      order: [['categoryId', 'ASC'], ['level', 'ASC']],
      limit,
      offset
    });

    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    // Build base URL with current filters
    let baseUrl = '/admin/weights?';
    if (search) baseUrl += `search=${encodeURIComponent(search)}&`;
    if (level) baseUrl += `level=${level}&`;

    res.render('admin/weights', {
      layout: 'layouts/admin',
      title: 'Skills Weights',
      weights,
      categories,
      search: search || '',
      level: level || '',
      ...buildPaginationData(count, page, limit, baseUrl)
    });
  } catch (error) {
    console.error('Weights management error:', error);
    req.session.error = 'Error loading weights.';
    res.redirect('/admin');
  }
});

// Update weight
router.post('/weights/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { weight } = req.body;

    const weightRecord = await CalculatorWeight.findByPk(id);
    if (!weightRecord) {
      req.session.error = 'Weight record not found.';
      return res.redirect('/admin/weights');
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue < 0.01 || weightValue > 10.00) {
      req.session.error = 'Weight must be between 0.01 and 10.00.';
      return res.redirect('/admin/weights');
    }

    await weightRecord.update({ weight: weightValue });

    req.session.success = 'Weight updated successfully.';
    res.redirect('/admin/weights');
  } catch (error) {
    console.error('Update weight error:', error);
    req.session.error = 'Error updating weight.';
    res.redirect('/admin/weights');
  }
});

// ==================== ADMIN PAYMENTS ====================

// Admin payment management
router.get('/payments', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, status, type } = req.query;

    let allPayments = [];

    // Fetch Stripe Transactions
    if (!type || type === 'transaction') {
      try {
        const whereClause = {};
        if (status && status !== 'all') {
          whereClause.status = status;
        }

        const transactions = await Transaction.findAll({
          where: whereClause,
          include: [
            { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
            { model: Invoice, as: 'invoice' }
          ],
          order: [['createdAt', 'DESC']]
        });

        transactions.forEach(t => {
          allPayments.push({
            id: t.id,
            type: 'transaction',
            fromUser: t.user,
            toUser: null,
            amount: parseFloat(t.amount),
            currency: 'MYR',
            status: t.status,
            description: t.description || 'Stripe Payment',
            invoice: t.invoice,
            createdAt: t.createdAt,
            stripePaymentIntentId: t.stripePaymentIntentId
          });
        });
      } catch (dbError) {
        console.log('Transaction table not ready:', dbError.message);
      }
    }

    // Fetch Tip Tokens
    if (!type || type === 'tip') {
      try {
        const tips = await TipToken.findAll({
          include: [
            { model: User, as: 'fromUser', attributes: ['id', 'name', 'email'] },
            { model: User, as: 'toUser', attributes: ['id', 'name', 'email'] }
          ],
          order: [['createdAt', 'DESC']]
        });

        tips.forEach(t => {
          allPayments.push({
            id: t.id,
            type: 'tip',
            fromUser: t.fromUser,
            toUser: t.toUser,
            amount: t.amount,
            currency: 'Tokens',
            status: 'succeeded',
            description: t.note || 'Tip Token Transfer',
            invoice: null,
            createdAt: t.createdAt,
            stripePaymentIntentId: null
          });
        });
      } catch (dbError) {
        console.log('TipToken table not ready:', dbError.message);
      }
    }

    // Sort all payments by date
    allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      allPayments = allPayments.filter(p =>
        (p.fromUser?.name && p.fromUser.name.toLowerCase().includes(searchLower)) ||
        (p.fromUser?.email && p.fromUser.email.toLowerCase().includes(searchLower)) ||
        (p.toUser?.name && p.toUser.name.toLowerCase().includes(searchLower)) ||
        (p.toUser?.email && p.toUser.email.toLowerCase().includes(searchLower))
      );
    }

    // Filter by status for transactions only
    if (status && type === 'transaction') {
      allPayments = allPayments.filter(p => p.status === status);
    }

    // Paginate
    const count = allPayments.length;
    const paginatedPayments = allPayments.slice(offset, offset + limit);

    // Build base URL with filters
    let baseUrl = '/admin/payments?';
    if (search) baseUrl += `search=${encodeURIComponent(search)}&`;
    if (status) baseUrl += `status=${status}&`;
    if (type) baseUrl += `type=${type}&`;

    res.render('admin/payments', {
      layout: 'layouts/admin',
      title: 'Manage Payments',
      payments: paginatedPayments,
      search: search || '',
      status: status || '',
      type: type || '',
      ...buildPaginationData(count, page, limit, baseUrl)
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    req.flash('error', 'Error loading payments.');
    res.redirect('/admin');
  }
});


// Admin refund transaction
router.post('/payments/:id/refund', async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{ model: Invoice, as: 'invoice' }]
    });

    if (!transaction) {
      req.flash('error', 'Transaction not found.');
      return res.redirect('/admin/payments');
    }

    if (transaction.status !== 'succeeded') {
      req.flash('error', 'Only succeeded transactions can be refunded.');
      return res.redirect('/admin/payments');
    }

    transaction.status = 'refunded';
    await transaction.save();

    if (transaction.invoice) {
      transaction.invoice.status = 'refunded';
      await transaction.invoice.save();
    }

    req.flash('success', 'Transaction refunded successfully.');
    res.redirect('/admin/payments');
  } catch (error) {
    console.error('Admin refund error:', error);
    req.flash('error', 'Error processing refund.');
    res.redirect('/admin/payments');
  }
});

// ==================== ADMIN PROFILE ====================

// Admin profile page
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.render('admin/profile', {
      layout: 'layouts/admin',
      title: 'Admin Profile',
      adminUser: user
    });
  } catch (error) {
    console.error('Admin profile error:', error);
    req.flash('error', 'Error loading profile.');
    res.redirect('/admin');
  }
});

// Update admin profile
router.post('/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/profile');
    }

    await user.update({ name, email });
    req.flash('success', 'Profile updated successfully.');
    res.redirect('/admin/profile');
  } catch (error) {
    console.error('Update admin profile error:', error);
    req.flash('error', 'Error updating profile.');
    res.redirect('/admin/profile');
  }
});

module.exports = router;


// GET /admin/payments - Payments management page
router.get('/payments', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const { search, type, status } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;

    let userWhereClause = {};
    if (search) {
      userWhereClause = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'], where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined, required: false },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit, offset
    });

    const payments = transactions.map(t => ({
      id: t.id, type: t.type || 'transaction', fromUser: t.user, toUser: t.recipient,
      amount: t.amount, currency: t.currency, status: t.status,
      description: t.description, createdAt: t.createdAt, stripePaymentIntentId: t.stripePaymentIntentId
    }));

    let baseUrl = '/admin/payments?';
    if (search) baseUrl += `search=${encodeURIComponent(search)}&`;
    if (type) baseUrl += `type=${type}&`;
    if (status) baseUrl += `status=${status}&`;

    res.render('admin/payments', {
      layout: 'layouts/admin', title: 'Manage Payments', payments,
      search: search || '', type: type || '', status: status || '',
      ...buildPaginationData(count, page, limit, baseUrl)
    });
  } catch (error) {
    console.error('Payments management error:', error);
    req.flash('error', 'Error loading payments.');
    res.redirect('/admin');
  }
});

router.post('/payments/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const stripe = require('../config/stripe');

    const transaction = await Transaction.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'recipient', attributes: ['id', 'name'] }
      ]
    });

    if (!transaction) {
      req.flash('error', 'Transaction not found.');
      return res.redirect('/admin/payments');
    }
    if (transaction.status !== 'succeeded') {
      req.flash('error', 'Only succeeded transactions can be refunded.');
      return res.redirect('/admin/payments');
    }

    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      metadata: { refundedBy: `admin_${req.user.id}`, reason: 'admin_refund' }
    });

    await transaction.update({ status: 'refunded' });

    await createNotification({
      userId: transaction.userId, title: 'Payment Refunded',
      message: `Your payment of RM${transaction.amount} has been refunded by admin.`
    });

    if (transaction.type === 'tip' && transaction.recipientUserId) {
      await createNotification({
        userId: transaction.recipientUserId, title: 'Tip Refunded',
        message: `A tip of RM${transaction.amount} has been refunded by admin.`
      });
    }

    req.flash('success', `Transaction #${id} refunded successfully.`);
    res.redirect('/admin/payments');
  } catch (error) {
    console.error('Refund error:', error);
    req.flash('error', `Error processing refund: ${error.message}`);
    res.redirect('/admin/payments');
  }
});

module.exports = router;
