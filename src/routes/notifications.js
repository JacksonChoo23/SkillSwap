const express = require('express');
const router = express.Router();

// GET /notifications - Render notifications center page
router.get('/', async (req, res) => {
  try {
    res.render('notifications/index', {
      title: 'Notifications',
    });
  } catch (err) {
    req.flash('error', 'Unable to load notifications page');
    res.redirect('/');
  }
});

module.exports = router;
