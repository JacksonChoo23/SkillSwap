require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const passport = require('./src/config/passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const morgan = require('morgan');
const path = require('path');

const { sequelize } = require('./src/config/database');
const logger = require('./src/config/logger');
const { isAuthenticated, isAdmin } = require('./src/middlewares/auth');

// Import routes
const authRoutes = require('./src/routes/auth');
const profileRoutes = require('./src/routes/profile');
const listingRoutes = require('./src/routes/listings');
const browseRoutes = require('./src/routes/browse');
const matchRoutes = require('./src/routes/match');
const messageRoutes = require('./src/routes/messages');
const contactsRoutes = require('./src/routes/contacts');
const historyRoutes = require('./src/routes/history');
const sessionRoutes = require('./src/routes/sessions');
const ratingRoutes = require('./src/routes/ratings');
const availabilityRoutes = require('./src/routes/availability');
const calculatorRoutes = require('./src/routes/calculator');
const adminRoutes = require('./src/routes/admin');
const tipsRoutes = require('./src/routes/tips');
const reportsRoutes = require('./src/routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Session store
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'Sessions'
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "data:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
  },
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(expressLayouts);
app.set('layout', 'layouts/main'); // 使用 src/views/layouts/main.ejs


// CSRF protection (after session and passport)
app.use(csrf({ cookie: false }));

// CSRF token middleware
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.user;
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.isAdmin = req.user && req.user.role === 'admin';
  next();
});

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  res.locals.info = req.session.info;
  delete req.session.success;
  delete req.session.error;
  delete req.session.info;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/profile', isAuthenticated, profileRoutes);
app.use('/listings', listingRoutes);
app.use('/browse', browseRoutes);
app.use('/match', isAuthenticated, matchRoutes);
// Messages UI deprecated: keep route for compatibility but redirect to history
app.use('/messages', isAuthenticated, (req, res, next) => res.redirect('/history/messages'));
app.use('/sessions', isAuthenticated, sessionRoutes);
app.use('/', isAuthenticated, contactsRoutes);
app.use('/', isAuthenticated, historyRoutes);
app.use('/ratings', isAuthenticated, ratingRoutes);
app.use('/availability', isAuthenticated, availabilityRoutes);
app.use('/calculator', calculatorRoutes);
app.use('/tips', isAuthenticated, tipsRoutes);
app.use('/reports', isAuthenticated, reportsRoutes);
app.use('/admin', isAuthenticated, isAdmin, adminRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('home', { title: 'SkillSwap MY - Peer Skill Exchange' });
});

// About page
app.get('/about', (req, res) => {
  res.render('about', { title: 'About SkillSwap MY' });
});

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).render('error', { 
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', {
      title: 'CSRF Error',
      message: 'Form submission failed. Please try again.',
      error: { status: 403 }
    });
  }
  
  res.status(err.status || 500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Database sync and server start
async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Sync database (in development) - without alter to avoid conflicts with session table
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      logger.info('Database synced.');
    }
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app; 