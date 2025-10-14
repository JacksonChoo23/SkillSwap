const express = require('express');
const { Availability } = require('../models');
const matchingService = require('../services/matchingService');

const router = express.Router();

// GET /availability - weekly form
router.get('/', async (req, res) => {
  try {
    const slots = await Availability.findAll({
      where: { userId: req.user.id },
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    // Build per-slot overlap indicator using existing overlap calculation
    const overlapMap = new Map();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const others = slots.filter((_, idx) => idx !== i);
      const score = matchingService.calculateAvailabilityOverlap([slot], others);
      overlapMap.set(slot.id, score > 0);
    }

    res.render('availability/index', {
      title: 'My Availability',
      slots,
      overlapMap
    });
  } catch (error) {
    console.error('Availability GET error:', error);
    req.session.error = 'Error loading availability.';
    res.redirect('/profile');
  }
});

// POST /availability - save non-overlapping slots per weekday
router.post('/', async (req, res) => {
  try {
    // Expect arrays: dayOfWeek[], startTime[], endTime[]
    const dayOfWeek = Array.isArray(req.body.dayOfWeek) ? req.body.dayOfWeek : (req.body.dayOfWeek ? [req.body.dayOfWeek] : []);
    const startTime = Array.isArray(req.body.startTime) ? req.body.startTime : (req.body.startTime ? [req.body.startTime] : []);
    const endTime = Array.isArray(req.body.endTime) ? req.body.endTime : (req.body.endTime ? [req.body.endTime] : []);

    if (dayOfWeek.length !== startTime.length || startTime.length !== endTime.length) {
      req.session.error = 'Invalid availability submission.';
      return res.redirect('/availability');
    }

    // Normalize and validate
    const parsed = [];
    for (let i = 0; i < dayOfWeek.length; i++) {
      const d = parseInt(dayOfWeek[i]);
      const s = String(startTime[i] || '').trim();
      const e = String(endTime[i] || '').trim();
      if (!Number.isInteger(d) || d < 0 || d > 6 || !/^\d{2}:\d{2}$/.test(s) || !/^\d{2}:\d{2}$/.test(e)) {
        req.session.error = 'Invalid day or time format.';
        return res.redirect('/availability');
      }
      if (s >= e) {
        req.session.error = 'Each slot end time must be after start time.';
        return res.redirect('/availability');
      }
      parsed.push({ dayOfWeek: d, startTime: s, endTime: e });
    }

    // Ensure non-overlapping per weekday
    const byDay = new Map();
    for (const slot of parsed) {
      const arr = byDay.get(slot.dayOfWeek) || [];
      arr.push(slot);
      byDay.set(slot.dayOfWeek, arr);
    }
    for (const [, arr] of byDay) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < arr.length - 1; i++) {
        const cur = arr[i];
        const nxt = arr[i + 1];
        if (cur.endTime > nxt.startTime) {
          req.session.error = 'Slots cannot overlap within the same day.';
          return res.redirect('/availability');
        }
      }
    }

    // Replace user's availability with new set
    await Availability.destroy({ where: { userId: req.user.id } });
    if (parsed.length > 0) {
      await Availability.bulkCreate(parsed.map(p => ({ ...p, userId: req.user.id })));
    }

    req.session.success = 'Availability saved.';
    res.redirect('/availability');
  } catch (error) {
    console.error('Availability POST error:', error);
    req.session.error = 'Error saving availability.';
    res.redirect('/availability');
  }
});

module.exports = router;


