const express = require('express');
const router = express.Router();

// About page route - accessible to all users
router.get('/', (req, res) => {
  res.render('about', { 
    title: 'About - SkillSwap MY',
    csrfToken: req.csrfToken()
  });
});

module.exports = router;