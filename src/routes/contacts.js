'use strict';

const express = require('express');
const { Op } = require('sequelize');
const { User, ContactHistory } = require('../models');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Simple in-memory rate limit per user-peer (1 min window, max 3)
const rateBuckets = new Map();
function allow(userId, peerId) {
  const key = `${userId}:${peerId}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxCount = 3;
  const bucket = rateBuckets.get(key) || { t: now, c: 0 };
  if (now - bucket.t > windowMs) {
    bucket.t = now; bucket.c = 0;
  }
  bucket.c += 1;
  rateBuckets.set(key, bucket);
  return bucket.c <= maxCount;
}

function ensureAuth(req, res, next) {
  if (!req.user) return res.status(401).send('Unauthorized');
  next();
}

router.get('/go/wa/:peerId', ensureAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const peerId = parseInt(req.params.peerId);
    const text = (req.query.text || '').toString();

    if (!Number.isInteger(peerId) || peerId <= 0 || peerId === userId) {
      return res.status(400).send('Invalid peer');
    }

    if (!allow(userId, peerId)) {
      return res.status(429).send('Too many requests');
    }

    const peer = await User.findByPk(peerId, { attributes: ['id','name','whatsapp_number'] });
    if (!peer || !peer.whatsapp_number) {
      return res.status(400).send('Peer has no WhatsApp number');
    }

    const t = await ContactHistory.sequelize.transaction();
    try {
      const [record, created] = await ContactHistory.findOrCreate({
        where: { user_id: userId, peer_user_id: peerId, channel: 'whatsapp' },
        defaults: {
          userId: userId,
          peerUserId: peerId,
          channel: 'whatsapp',
          firstContactedAt: new Date(),
          lastContactedAt: new Date(),
          count: 1
        },
        transaction: t
      });
      if (!created) {
        await record.update({
          count: record.count + 1,
          lastContactedAt: new Date(),
          updatedAt: new Date()
        }, { transaction: t });
      }
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }

    const base = 'https://wa.me';
    const phone = peer.whatsapp_number.replace(/[^+\d]/g, '');
    const qp = text ? `?text=${encodeURIComponent(text)}` : '';
    return res.redirect(302, `${base}/${encodeURIComponent(phone)}${qp}`);
  } catch (e) {
    next(e);
  }
});

router.post('/history/wa/mark/:peerId', ensureAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const peerId = parseInt(req.params.peerId);
    if (!Number.isInteger(peerId) || peerId <= 0 || peerId === userId) {
      return res.status(400).send('Invalid peer');
    }

    const t = await ContactHistory.sequelize.transaction();
    try {
      const [record, created] = await ContactHistory.findOrCreate({
        where: { user_id: userId, peer_user_id: peerId, channel: 'whatsapp' },
        defaults: {
          userId: userId,
          peerUserId: peerId,
          channel: 'whatsapp',
          firstContactedAt: new Date(),
          lastContactedAt: new Date(),
          count: 1
        },
        transaction: t
      });
      if (!created) {
        await record.update({
          count: record.count + 1,
          lastContactedAt: new Date(),
          updatedAt: new Date()
        }, { transaction: t });
      }
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }

    res.redirect('back');
  } catch (e) { next(e); }
});

module.exports = router;


