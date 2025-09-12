const express = require('express');
const router = express.Router();
const checkToxicity = require('../../utils/checkToxicity');
const { Skill } = require('../models');

router.post('/add', async (req, res) => {
  try {
    const { title, description } = req.body;

    // Check for toxicity
    const moderationResult = await checkToxicity(description);

    if (moderationResult.toxic) {
      const labels = moderationResult.details.map((d) => d.label).join(', ');
      return res.status(400).send(`Your description contains: ${labels}`);
    }

    // Save the skill if not toxic
    await Skill.create({ title, description });
    res.status(201).send('Skill added successfully');
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
