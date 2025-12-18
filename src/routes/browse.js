const express = require('express');
const { User, UserSkill, Skill, Category, Availability, Rating } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('../services/cacheService');

const router = express.Router();

// Browse page
router.get('/', async (req, res) => {
  try {
    const { category, level, location, type, search } = req.query;

    // Pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 12));
    const offset = (page - 1) * limit;

    // Build where clause for users
    const userWhere = { isPublic: true, role: 'user' };
    if (location) {
      userWhere.location = { [Op.like]: `%${location}%` };
    }

    // Build include clause for skills
    const skillInclude = {
      model: UserSkill,
      as: 'userSkills',
      required: false,
      include: [{
        model: Skill,
        required: false,
        include: [{
          model: Category,
          required: false
        }]
      }]
    };

    if (category || level || type) {
      skillInclude.where = {};
      if (type) {
        skillInclude.where.type = type;
      }
      if (level) {
        skillInclude.where.level = level;
      }
      if (category) {
        // Use Sequelize.literal to properly reference the joined table
        skillInclude.include[0].where = { categoryId: category };
        skillInclude.include[0].required = true;
        skillInclude.required = true;
      }
    }

    // Generate cache key for browse queries
    const hasFilters = category || level || location || type || search;
    const cacheKey = hasFilters ? null : `browse_users_page_${page}_limit_${limit}`;

    // Try to get from cache if no filters applied
    let count, users;
    const cached = cacheKey ? cacheService.get(cacheKey) : null;

    if (cached) {
      count = cached.count;
      users = cached.users;
    } else {
      const result = await User.findAndCountAll({
        where: userWhere,
        include: [
          skillInclude,
          {
            model: Availability,
            as: 'availabilities'
          }
        ],
        order: [['name', 'ASC']],
        limit,
        offset,
        distinct: true // Important for correct count with includes
      });

      count = result.count;
      // Convert to plain objects before caching to avoid clone issues
      users = result.rows.map(u => u.get({ plain: true }));

      // Cache for 60 seconds if no filters
      if (cacheKey) {
        cacheService.set(cacheKey, { count, users }, 60);
      }
    }

    // Filter by search term if provided (post-query filter for simplicity)
    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.bio?.toLowerCase().includes(searchLower) ||
        user.location?.toLowerCase().includes(searchLower) ||
        user.userSkills.some(us =>
          us.Skill.name.toLowerCase().includes(searchLower) ||
          us.Skill.Category.name.toLowerCase().includes(searchLower)
        )
      );
    }

    // Filter out the logged-in user's account
    if (req.user) {
      filteredUsers = filteredUsers.filter(user => user.id !== req.user.id);
    }

    // Cache categories and skills for 5 minutes
    const categories = await cacheService.getOrFetch('browse_categories', async () => {
      const cats = await Category.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });
      return cats.map(c => c.get({ plain: true }));
    }, 300);

    const skills = await cacheService.getOrFetch('browse_skills', async () => {
      const sks = await Skill.findAll({
        include: [Category],
        order: [['name', 'ASC']]
      });
      return sks.map(s => s.get({ plain: true }));
    }, 300);

    const totalPages = Math.ceil(count / limit);

    res.render('browse/index', {
      title: 'Browse Users - SkillSwap MY',
      users: filteredUsers,
      categories,
      skills,
      filters: { category, level, location, type, search },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        limit,
        baseUrl: '/browse'
      }
    });
  } catch (error) {
    console.error('Browse error:', error);
    req.flash('error', `Error loading browse page: ${error.message}`);
    res.redirect('/');
  }
});

// View user profile
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
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

    if (!user || !user.isPublic) {
      req.session.error = 'User profile not found or not public.';
      return res.redirect('/browse');
    }

    // Fetch ratings
    const ratings = await Rating.findAll({
      where: { rateeId: id },
      include: [
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'name', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.render('browse/user', {
      title: `${user.name} - SkillSwap MY`,
      profileUser: user,
      ratings,
      from: req.query.from
    });
  } catch (error) {
    console.error('User profile error:', error);
    req.session.error = 'Error loading user profile.';
    res.redirect('/browse');
  }
});

module.exports = router;