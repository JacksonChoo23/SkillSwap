const express = require('express');
const { User, Listing, Report, Category, Skill, CalculatorWeight, Notification, LearningSession, Transaction, Invoice } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { checkGeminiHealth } = require('../../utils/geminiModeration');
const { sendNotificationEmail } = require('../../utils/mailer');
const { createNotification } = require('../services/notificationService');


const router = express.Router();

// Helper function to get pagination params
function getPagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 10));
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

    const openReports = await Report.count({ where: { status: 'open' } });

    // Revenue (from Transaction model if exists)
    let totalRevenue = 0;
    let revenueLastMonth = 0;
    try {
      const revenueResult = await Transaction.sum('amount', { where: { status: 'succeeded' } });
      totalRevenue = revenueResult || 0;
      const revenueMonthResult = await Transaction.sum('amount', {
        where: { status: 'succeeded', createdAt: { [Op.gte]: thirtyDaysAgo } }
      });
      revenueLastMonth = revenueMonthResult || 0;
    } catch (e) { /* Transaction model may not exist yet */ }

    const stats = {
      totalUsers,
      usersLastMonth,
      userGrowth: usersPrevMonth > 0 ? Math.round(((usersLastMonth - usersPrevMonth) / usersPrevMonth) * 100) : 100,
      totalListings,
      listingsLastMonth,
      totalSessions,
      completedSessions,
      openReports,
      totalRevenue,
      revenueLastMonth
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
    const whereClause = { role: { [Op.ne]: 'admin' } }; // Exclude admins from list by default

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

    const { count, rows: listings } = await Listing.findAndCountAll({
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const pagination = buildPaginationData(count, page, limit, '/admin/listings');
    res.render('admin/listings', {
      layout: 'layouts/admin',
      title: 'Manage Listings',
      listings,
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

    const { count, rows: reports } = await Report.findAndCountAll({
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'targetUser', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.render('admin/reports', {
      layout: 'layouts/admin',
      title: 'Manage Reports',
      reports,
      ...buildPaginationData(count, page, limit, '/admin/reports')
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

    const { count, rows: categories } = await Category.findAndCountAll({
      include: [{ model: Skill, as: 'skills', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
      limit,
      offset
    });

    res.render('admin/categories', {
      layout: 'layouts/admin',
      title: 'Manage Categories',
      categories,
      ...buildPaginationData(count, page, limit, '/admin/categories')
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

    const { count, rows: weights } = await CalculatorWeight.findAndCountAll({
      include: [{ model: Category, attributes: ['id', 'name'] }],
      order: [['categoryId', 'ASC'], ['level', 'ASC']],
      limit,
      offset
    });

    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    res.render('admin/weights', {
      layout: 'layouts/admin',
      title: 'Match Weights',
      weights,
      categories,
      ...buildPaginationData(count, page, limit, '/admin/weights')
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

    let transactions = [];
    let count = 0;

    try {
      const result = await Transaction.findAndCountAll({
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: Invoice, as: 'invoice' }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });
      transactions = result.rows;
      count = result.count;
    } catch (dbError) {
      // Table may not exist yet
      console.log('Transaction table not ready:', dbError.message);
    }

    res.render('admin/payments', {
      layout: 'layouts/admin',
      title: 'Manage Payments',
      transactions,
      ...buildPaginationData(count, page, limit, '/admin/payments')
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
