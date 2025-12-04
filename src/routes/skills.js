const express = require('express');
const router = express.Router();
const { checkAdultAndToxicContent } = require('../../utils/geminiModeration');
const { Skill, Category } = require('../models');

router.post('/add', async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).send('Name and Category ID are required.');
    }

    // Validate Category
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(400).send('Invalid Category ID.');
    }

    // Check for toxicity in name
    try {
      const moderationResult = await checkAdultAndToxicContent(name);

      if (moderationResult.isToxic || moderationResult.isAdult) {
        const reasons = moderationResult.reasons ? moderationResult.reasons.join(', ') : 'Inappropriate content';
        return res.status(400).send(`Skill name flagged: ${reasons}`);
      }
    } catch (modError) {
      console.warn('Moderation check failed, proceeding with caution:', modError);
    }

    // Save the skill
    await Skill.create({
      name: name,
      categoryId: categoryId
    });

    res.status(201).send('Skill added successfully');
  } catch (error) {
    console.error('Error adding skill:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send('Skill already exists.');
    }
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
