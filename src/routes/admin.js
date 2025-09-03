const express = require('express');
const { User, Listing, Report, Category, Skill, CalculatorWeight } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Admin dashboard
router.get('/', async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.count({ where: { role: 'user' } }),
      totalListings: await Listing.count(),
      pendingListings: await Listing.count({ where: { status: 'pending' } }),
      openReports: await Report.count({ where: { status: 'open' } })
    };

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

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - SkillSwap MY',
      stats,
      recentListings,
      recentReports
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.session.error = 'Error loading admin dashboard.';
    res.redirect('/');
  }
});

// Users management
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/users', {
      title: 'Manage Users - SkillSwap MY',
      users
    });
  } catch (error) {
    console.error('Users management error:', error);
    req.session.error = 'Error loading users.';
    res.redirect('/admin');
  }
});

// Suspend/unsuspend user
router.post('/users/:id/toggle-suspend', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      req.session.error = 'User not found.';
      return res.redirect('/admin/users');
    }

    if (user.role === 'admin') {
      req.session.error = 'Cannot suspend admin users.';
      return res.redirect('/admin/users');
    }

    await user.update({ isPublic: !user.isPublic });

    req.session.success = `User ${user.isPublic ? 'unsuspended' : 'suspended'} successfully.`;
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Toggle suspend error:', error);
    req.session.error = 'Error updating user status.';
    res.redirect('/admin/users');
  }
});

// Listings management
router.get('/listings', async (req, res) => {
  try {
    const listings = await Listing.findAll({
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/listings', {
      title: 'Manage Listings - SkillSwap MY',
      listings
    });
  } catch (error) {
    console.error('Listings management error:', error);
    req.session.error = 'Error loading listings.';
    res.redirect('/admin');
  }
});

// Approve/reject listing
router.post('/listings/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;
    
    if (!['approve', 'reject'].includes(action)) {
      req.session.error = 'Invalid action.';
      return res.redirect('/admin/listings');
    }

    const listing = await Listing.findByPk(id);
    if (!listing) {
      req.session.error = 'Listing not found.';
      return res.redirect('/admin/listings');
    }

    await listing.update({ status: action === 'approve' ? 'approved' : 'rejected' });

    req.session.success = `Listing ${action}d successfully.`;
    res.redirect('/admin/listings');
  } catch (error) {
    console.error('Listing action error:', error);
    req.session.error = 'Error updating listing status.';
    res.redirect('/admin/listings');
  }
});

// Reports management
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'targetUser', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/reports', {
      title: 'Manage Reports - SkillSwap MY',
      reports
    });
  } catch (error) {
    console.error('Reports management error:', error);
    req.session.error = 'Error loading reports.';
    res.redirect('/admin');
  }
});

// Close report
router.post('/reports/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await Report.findByPk(id);
    if (!report) {
      req.session.error = 'Report not found.';
      return res.redirect('/admin/reports');
    }

    await report.update({ status: 'closed' });

    req.session.success = 'Report closed successfully.';
    res.redirect('/admin/reports');
  } catch (error) {
    console.error('Close report error:', error);
    req.session.error = 'Error closing report.';
    res.redirect('/admin/reports');
  }
});

// Categories management
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{ model: Skill, attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });

    res.render('admin/categories', {
      title: 'Manage Categories - SkillSwap MY',
      categories
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

// Calculator weights management
router.get('/weights', async (req, res) => {
  try {
    const weights = await CalculatorWeight.findAll({
      include: [{ model: Category, attributes: ['id', 'name'] }],
      order: [['categoryId', 'ASC'], ['level', 'ASC']]
    });

    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    res.render('admin/weights', {
      title: 'Manage Calculator Weights - SkillSwap MY',
      weights,
      categories
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

module.exports = router; 