const express = require('express');
const { User, UserSkill, Skill, Category, Availability } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Browse page
router.get('/', async (req, res) => {
  try {
    const { category, level, location, type, search } = req.query;

    // Build where clause for users
    const userWhere = { isPublic: true, role: 'user' };
    if (location) {
      userWhere.location = { [Op.like]: `%${location}%` };
    }

    // Build include clause for skills
    const skillInclude = {
      model: UserSkill,
      as: 'userSkills',
      include: [{ model: Skill, include: [Category] }]
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
        skillInclude.include[0].where = { categoryId: category };
      }
    }

    const users = await User.findAll({
      where: userWhere,
      include: [
        skillInclude,
        {
          model: Availability,
          as: 'availabilities'
        }
      ],
      order: [['name', 'ASC']]
    });

    // Filter by search term if provided
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
    filteredUsers = filteredUsers.filter(user => user.id !== req.user.id);

    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    const skills = await Skill.findAll({
      include: [Category],
      order: [['name', 'ASC']]
    });

    res.render('browse/index', {
      title: 'Browse Users - SkillSwap MY',
      users: filteredUsers,
      categories,
      skills,
      filters: { category, level, location, type, search }
    });
  } catch (error) {
    console.error('Browse error:', error);
    req.session.error = 'Error loading browse page.';
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

    res.render('browse/user', {
      title: `${user.name} - SkillSwap MY`,
      profileUser: user,
      from: req.query.from
    });
  } catch (error) {
    console.error('User profile error:', error);
    req.session.error = 'Error loading user profile.';
    res.redirect('/browse');
  }
});

module.exports = router;