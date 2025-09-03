'use strict';

const express = require('express');
const { Op } = require('sequelize');
const { ContactHistory, User } = require('../models');

const router = express.Router();

function ensureAuth(req, res, next) {
  if (!req.user) return res.redirect('/auth/login');
  next();
}

router.get('/history/messages', ensureAuth, async (req, res, next) => {
  try {
    const rows = await ContactHistory.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'peer', attributes: ['id','name','whatsapp_number','location'] }
      ],
      order: [['last_contacted_at','DESC']]
    });
    res.render('history/messages', { title: 'Message History', rows });
  } catch (e) { next(e); }
});

router.post('/history/messages/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await ContactHistory.destroy({ where: { id, user_id: req.user.id } });
    res.redirect('/history/messages');
  } catch (e) { next(e); }
});

module.exports = router;


