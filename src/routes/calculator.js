const express = require('express');
const calculatorService = require('../services/calculatorService');
const { Skill, Category } = require('../models');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// Calculator page
router.get('/', async (req, res) => {
  try {
    const skills = await Skill.findAll({
      include: [Category],
      order: [['name', 'ASC']]
    });

    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    res.render('calculator/index', {
      title: 'Skill Value Calculator - SkillSwap MY',
      skills,
      categories,
      result: null
    });
  } catch (error) {
    console.error('Calculator error:', error);
    req.session.error = 'Error loading calculator.';
    res.redirect('/');
  }
});

// Calculate fair exchange
router.post('/calculate', validate(schemas.calculator), async (req, res) => {
  try {
    const { skillAId, skillBId, levelA, levelB, hoursA, hoursB } = req.body;

    const result = await calculatorService.calculateFairExchange(
      parseInt(skillAId),
      parseInt(skillBId),
      levelA,
      levelB,
      parseFloat(hoursA),
      parseFloat(hoursB)
    );

    const skills = await Skill.findAll({
      include: [Category],
      order: [['name', 'ASC']]
    });

    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });

    res.render('calculator/index', {
      title: 'Skill Value Calculator - SkillSwap MY',
      skills,
      categories,
      result
    });
  } catch (error) {
    console.error('Calculate error:', error);
    req.session.error = error.message || 'Error calculating fair exchange.';
    res.redirect('/calculator');
  }
});

module.exports = router; 