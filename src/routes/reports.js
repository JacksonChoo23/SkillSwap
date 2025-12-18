const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csrf = require('csurf');
const { Report, User, Notification } = require('../models');
const { validate, schemas } = require('../middlewares/validate');
const { analyzeReportEvidence } = require('../../utils/geminiModeration');
const { applyPenalty, getPenaltyDisplay, PENALTY_CONFIG } = require('../services/PenaltyService');

const router = express.Router();
const csrfProtection = csrf({ cookie: false });

// Configure multer for evidence uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'evidence');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `evidence-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

// GET /reports/new - Show report creation form
router.get('/new', async (req, res) => {
  try {
    const targetUserId = req.query.targetUserId;
    let targetUser = null;

    if (targetUserId) {
      targetUser = await User.findByPk(targetUserId, {
        attributes: ['id', 'name', 'profileImage']
      });
    }

    res.render('reports/create', {
      title: 'Report User',
      targetUser,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Report form error:', error);
    req.flash('error', 'Error loading report form.');
    res.redirect('back');
  }
});

// POST /reports - Submit a report with evidence
// NOTE: Global CSRF is skipped for this route in app.js. We apply it manually AFTER upload.
router.post('/', upload.array('evidence', 5), csrfProtection, async (req, res) => {
  try {
    const { targetUserId, reason } = req.body;
    const targetId = parseInt(targetUserId);

    // Validation
    if (!Number.isInteger(targetId)) {
      req.flash('error', 'Invalid target user.');
      return res.redirect('back');
    }
    if (targetId === req.user.id) {
      req.flash('error', 'You cannot report yourself.');
      return res.redirect('back');
    }
    if (!reason || reason.trim().length < 10) {
      req.flash('error', 'Please provide a detailed reason (at least 10 characters).');
      return res.redirect('back');
    }

    const target = await User.findByPk(targetId);
    if (!target) {
      req.flash('error', 'Target user not found.');
      return res.redirect('back');
    }

    // Get uploaded file paths
    const evidencePaths = req.files ? req.files.map(f => `/uploads/evidence/${f.filename}`) : [];

    // Create report with pending_ai status
    const report = await Report.create({
      reporterId: req.user.id,
      targetUserId: targetId,
      reason: reason.trim(),
      evidence: evidencePaths,
      status: 'pending_ai',
      aiVerdict: 'pending',
      severity: 'none'
    });

    // Trigger AI analysis asynchronously
    const absolutePaths = evidencePaths.map(p => path.join(process.cwd(), 'public', p));
    const aiResult = await analyzeReportEvidence(reason.trim(), absolutePaths);

    // Update report with AI analysis
    await report.update({
      aiAnalysis: aiResult,
      aiVerdict: aiResult.verdict,
      severity: aiResult.severity,
      status: 'ai_reviewed'
    });

    // Redirect to review page
    req.flash('success', 'Report submitted. AI analysis complete.');
    res.redirect(`/reports/${report.id}/review`);
  } catch (error) {
    console.error('Report submission error:', error);
    req.flash('error', 'Error submitting report.');
    res.redirect('back');
  }
});

// GET /reports/:id/review - Show AI analysis to user
router.get('/:id/review', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'targetUser', attributes: ['id', 'name', 'profileImage'] }
      ]
    });

    if (!report) {
      req.flash('error', 'Report not found.');
      return res.redirect('/profile');
    }

    // Only reporter or admin can view
    if (report.reporterId !== req.user.id && req.user.role !== 'admin') {
      req.flash('error', 'Access denied.');
      return res.redirect('/profile');
    }

    const penaltyDisplay = report.severity !== 'none' ? getPenaltyDisplay(report.severity) : null;

    res.render('reports/review', {
      title: 'Report Review',
      report,
      aiAnalysis: report.aiAnalysis || {},
      penaltyDisplay,
      estimatedTimes: {
        ai: 'Completed',
        manual: '24-48 hours'
      },
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Report review error:', error);
    req.flash('error', 'Error loading report review.');
    res.redirect('/profile');
  }
});

// POST /reports/:id/escalate - User disagrees, escalate to admin
router.post('/:id/escalate', csrfProtection, async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);

    if (!report) {
      req.flash('error', 'Report not found.');
      return res.redirect('/profile');
    }

    // Only reporter can escalate
    if (report.reporterId !== req.user.id) {
      req.flash('error', 'Access denied.');
      return res.redirect('/profile');
    }

    await report.update({
      status: 'escalated',
      adminNotes: `User escalated on ${new Date().toISOString()}. Reason: Disagrees with AI verdict.`
    });

    // Notify admins
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await Notification.create({
        user_id: admin.id,
        title: 'Report Escalated',
        message: `Report #${report.id} has been escalated for manual review.`,
        status: 'unread'
      });
    }

    req.flash('success', 'Report escalated to admin for manual review. Expected response time: 24-48 hours.');
    res.redirect('/profile');
  } catch (error) {
    console.error('Report escalation error:', error);
    req.flash('error', 'Error escalating report.');
    res.redirect('back');
  }
});

// POST /reports/:id/accept - User agrees with AI verdict
router.post('/:id/accept', csrfProtection, async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);

    if (!report) {
      req.flash('error', 'Report not found.');
      return res.redirect('/profile');
    }

    // Only reporter can accept
    if (report.reporterId !== req.user.id) {
      req.flash('error', 'Access denied.');
      return res.redirect('/profile');
    }

    if (report.aiVerdict === 'violation' && report.severity !== 'none') {
      // Apply the penalty
      const penaltyResult = await applyPenalty(
        report.targetUserId,
        report.severity,
        report.aiAnalysis?.summary || 'Policy violation',
        report.id
      );

      await report.update({
        status: 'auto_penalized',
        penaltyApplied: penaltyResult.description || report.severity
      });

      req.flash('success', `Report resolved. ${penaltyResult.message || 'Action taken against the user.'}`);
    } else {
      // No violation found
      await report.update({
        status: 'resolved'
      });
      req.flash('info', 'Thank you for your report. No action required based on the analysis.');
    }

    res.redirect('/profile');
  } catch (error) {
    console.error('Report acceptance error:', error);
    req.flash('error', 'Error processing report.');
    res.redirect('back');
  }
});

// GET /reports/my - List user's reports
router.get('/my', async (req, res) => {
  try {
    const reports = await Report.findAll({
      where: { reporterId: req.user.id },
      include: [
        { model: User, as: 'targetUser', attributes: ['id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.render('reports/my', {
      title: 'My Reports',
      reports
    });
  } catch (error) {
    console.error('My reports error:', error);
    req.flash('error', 'Error loading reports.');
    res.redirect('/profile');
  }
});

module.exports = router;
