require('dotenv').config();
const express = require('express');
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
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...(isDev ? ["https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"] : [])],
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

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  const viaSession = !!(req.session && req.session.user);

  res.locals.isAuthenticated = viaPassport || viaSession;
  res.locals.currentUser = req.user || req.session?.user || null;
  res.locals.title = res.locals.title || 'SkillSwap';

  // flash 优先
  const fSuccess = req.flash('success');
  const fError = req.flash('error');
  const fInfo = req.flash('info');

  // 兼容旧的 session 写法
  const sSuccess = req.session?.success;
  const sError = req.session?.error;
  const sInfo = req.session?.info;

  res.locals.success = (fSuccess && fSuccess.length ? fSuccess : (sSuccess ? (Array.isArray(sSuccess) ? sSuccess : [sSuccess]) : []));
  res.locals.error   = (fError && fError.length ? fError : (sError ? (Array.isArray(sError) ? sError : [sError]) : []));
  res.locals.info    = (fInfo && fInfo.length ? fInfo : (sInfo ? (Array.isArray(sInfo) ? sInfo : [sInfo]) : []));

  if (req.session) {
    delete req.session.success;
    delete req.session.error;
    delete req.session.info;
  }

  next();
});

// About page - accessible to all users (before CSRF)
app.get('/about', (req, res) => {
  const isAuthed = (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) || !!(req.session && req.session.user);
  const currentUser = req.user || req.session?.user || null;
  
  res.render('about', {
    title: 'About - SkillSwap MY',
    csrfToken: '', // No CSRF token needed for public page
    isAuthenticated: isAuthed,
    currentUser: currentUser,
    user: currentUser,
    isAdmin: !!(currentUser && currentUser.role === 'admin')
  });
});

// CSRF (after session)
app.use(csrf({ cookie: false }));
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

// Routes
app.use('/auth', authRoutes);
app.use('/profile', isAuthenticated, profileRoutes);
app.use('/listings', listingRoutes);
app.use('/browse', browseRoutes);
app.use('/match', isAuthenticated, matchRoutes);

// keep /messages but redirect to history
app.use('/messages', isAuthenticated, (req, res) => res.redirect('/history/messages'));

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
// Pages
app.get('/', (req, res) => {
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
    isAdmin: !!(req.user && req.user.role === 'admin')
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
      isAdmin: !!(req.user && req.user.role === 'admin')
    });
  }

  res.status(err.status || 500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
    error: process.env.NODE_ENV === 'development' ? err : {},
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user || null,
    isAdmin: !!(req.user && req.user.role === 'admin')
  });
});


// Start
// Start
async function startServer() {
  const PORT = process.env.PORT || 8080;

  // 先监听端口，保证 Cloud Run 健康检查能通过
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
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
