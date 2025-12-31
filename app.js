require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const csrf = require('csurf');
const flash = require('connect-flash');

const passport = require('./src/config/passport');
const { sequelize } = require('./src/config/database');
const logger = require('./src/config/logger');
const { isAuthenticated, isAdmin } = require('./src/middlewares/auth');

// Routes
const authRoutes = require('./src/routes/auth');
const profileRoutes = require('./src/routes/profile');
const listingRoutes = require('./src/routes/listings');
const browseRoutes = require('./src/routes/browse');
const matchRoutes = require('./src/routes/match');
const messageRoutes = require('./src/routes/messages'); // kept for compat redirect
const contactsRoutes = require('./src/routes/contacts');
const historyRoutes = require('./src/routes/history');
const sessionRoutes = require('./src/routes/sessions');
const ratingRoutes = require('./src/routes/ratings');
const availabilityRoutes = require('./src/routes/availability');
const calculatorRoutes = require('./src/routes/calculator');
const adminRoutes = require('./src/routes/admin');
const tipsRoutes = require('./src/routes/tips');
const reportsRoutes = require('./src/routes/reports');
const aboutRouter = require('./src/routes/about');
const notificationsRoutes = require('./src/routes/notifications');
const skillsRoutes = require('./src/routes/skills');
const leaderboardRoutes = require('./src/routes/leaderboard');
const paymentRoutes = require('./src/routes/payment');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// trust proxy for secure cookies behind proxy
if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security
const isDev = process.env.NODE_ENV !== 'production';

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://*.fontawesome.com"],
        fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://*.fontawesome.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com", ...(isDev ? ["https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"] : [])],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);


// Rate limit
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Webhook - Must be before body parser and CSRF
const webhookRoutes = require('./src/routes/webhook');
app.use('/webhook', webhookRoutes);

// Parsers with size limits to prevent DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sessions (use lowercase table 'sessions')
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions', // ← fix: lowercase
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 7 * 24 * 60 * 60 * 1000
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: false, // Don't extend session on every request
    cookie: {
      secure: process.env.NODE_ENV === 'production', // set TRUST_PROXY=1 if behind proxy
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Flash
app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());

// View engine
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Locals (keep simple defaults)
app.use((req, res, next) => {
  const viaPassport = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;

  res.locals.isAuthenticated = viaPassport;
  res.locals.currentUser = req.user || null;
  res.locals.title = res.locals.title || 'SkillSwap';

  // OPTIMIZED: Read all flash messages at once to reduce session access
  const messages = req.flash();
  res.locals.success = messages.success || [];
  res.locals.error = messages.error || [];
  res.locals.info = messages.info || [];
  res.locals.account_terminated = messages.account_terminated || [];

  next();
});



// CSRF (after session)
// CSRF (after session)
const csrfProtection = csrf({ cookie: false });
app.use((req, res, next) => {
  // Skip global CSRF for report submission (multipart/form-data)
  // We handle it manually in the reports route after multer
  if (req.originalUrl.startsWith('/reports') && req.method === 'POST') {
    req.csrfToken = () => 'skipped-for-upload';
    return next();
  }
  csrfProtection(req, res, next);
});
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.user || null;
  res.locals.isAdmin = !!(req.user && req.user.role === 'admin');
  next();
});

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// API endpoint for real-time account status check (before auth-protected routes)
app.get('/api/account-status', async (req, res) => {
  // If not authenticated, return not-authenticated status
  if (!req.isAuthenticated() || !req.user) {
    return res.json({ authenticated: false });
  }

  try {
    // Fetch fresh user data from database
    const { User } = require('./src/models');
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.json({ authenticated: false });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.json({
        authenticated: true,
        terminated: true,
        type: 'banned',
        title: 'Account Permanently Banned',
        message: 'Your account has been permanently banned due to violation of our terms of service.'
      });
    }

    // Check if user is suspended
    if (user.isSuspended && user.suspensionEndDate && new Date() < new Date(user.suspensionEndDate)) {
      const endDate = new Date(user.suspensionEndDate).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return res.json({
        authenticated: true,
        terminated: true,
        type: 'suspended',
        title: 'Account Suspended',
        message: `Your account has been suspended until ${endDate}.`,
        reason: user.suspensionReason || 'Violation of terms of service'
      });
    }

    // Account is fine
    return res.json({
      authenticated: true,
      terminated: false
    });
  } catch (error) {
    console.error('Account status check error:', error);
    return res.json({ authenticated: true, terminated: false });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/profile', isAuthenticated, profileRoutes);
app.use('/listings', listingRoutes);
app.use('/browse', browseRoutes);
app.use('/about', aboutRouter);
app.use('/match', isAuthenticated, matchRoutes);

// Messages route
const messagesRoutes = require('./src/routes/messages');
app.use('/messages', isAuthenticated, messagesRoutes);

app.use('/sessions', isAuthenticated, sessionRoutes);
app.use('/', isAuthenticated, contactsRoutes);
app.use('/', isAuthenticated, historyRoutes);
app.use('/ratings', isAuthenticated, ratingRoutes);
app.use('/availability', isAuthenticated, availabilityRoutes);
app.use('/calculator', calculatorRoutes);
app.use('/tips', isAuthenticated, tipsRoutes);
app.use('/reports', isAuthenticated, reportsRoutes);
app.use('/admin', isAuthenticated, isAdmin, adminRoutes);
app.use('/notifications', isAuthenticated, notificationsRoutes);
app.use('/skills', isAuthenticated, skillsRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/payment', isAuthenticated, paymentRoutes);
app.use('/dashboard', isAuthenticated, dashboardRoutes);
// Pages


app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('home', { title: 'SkillSwap MY - Peer Skill Exchange' });
});

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 },
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user || null,
    isAdmin: !!(req.user && req.user.role === 'admin'),
    csrfToken: (req.csrfToken && typeof req.csrfToken === 'function') ? req.csrfToken() : ''
  });
});

// Errors
app.use((err, req, res, next) => {
  logger.error(err && err.stack ? err.stack : err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', {
      title: 'CSRF Error',
      message: 'Form submission failed. Please try again.',
      error: { status: 403 },
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user || null,
      isAdmin: !!(req.user && req.user.role === 'admin'),
      csrfToken: (req.csrfToken && typeof req.csrfToken === 'function') ? req.csrfToken() : ''
    });
  }

  res.status(err.status || 500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
    error: process.env.NODE_ENV === 'development' ? err : {},
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user || null,
    isAdmin: !!(req.user && req.user.role === 'admin'),
    csrfToken: (req.csrfToken && typeof req.csrfToken === 'function') ? req.csrfToken() : ''
  });
});


// Start
async function startServer() {
  const PORT = process.env.PORT || 8080;

  // Create HTTP server and attach Socket.io
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST']
    }
  });

  // Make io accessible to routes via app.locals
  app.set('io', io);

  // Socket.io connection handler
  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Join a specific thread room
    socket.on('join_thread', (threadId) => {
      socket.join(`thread_${threadId}`);
      logger.debug(`Socket ${socket.id} joined thread_${threadId}`);
    });

    // Join user-specific room for global notifications (e.g. suspension)
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      logger.debug(`Socket ${socket.id} joined user_${userId}`);
    });

    // Leave a thread room
    socket.on('leave_thread', (threadId) => {
      socket.leave(`thread_${threadId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // Start listening
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info('Socket.io enabled for real-time messaging');
  });

  // 异步尝试连接数据库并同步 session 表
  (async function tryConnect(retries = 0) {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully.');

      await sessionStore.sync();
      logger.info('Session store table synced.');

      if (process.env.ALLOW_SYNC === 'true') {
        await sequelize.sync({ alter: false, force: false });
        logger.info('Database synced by sequelize.sync().');
      }
    } catch (error) {
      logger.error('Database connection attempt failed:', error && error.message ? error.message : error);
      if (retries < 10) {
        setTimeout(() => tryConnect(retries + 1), 5000);
      } else {
        logger.error('Database connection failed after multiple attempts.');
      }
    }
  })();

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  });
}



startServer();

module.exports = app;
