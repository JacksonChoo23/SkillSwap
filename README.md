# SkillSwap MY

A peer skill exchange platform for Malaysia where users can teach and learn skills from each other in a fair, time-for-time exchange system.

## Features

### User Features
- **User Authentication**: Secure registration with email verification, login, and password reset
- **Profile Management**: Bio, location, WhatsApp contact, profile image, and privacy settings
- **Skills Management**: Add skills to teach/learn with proficiency levels
- **Availability Scheduling**: Set weekly time slots for skill exchange
- **Listing Management**: Create, edit, pause, activate, and delete skill offerings
- **Matching System**: AI-powered score-based recommendation engine
- **Session Management**: Full workflow from request → confirm → verify code → complete → rate
- **Messaging System**: Real-time threaded conversations with Socket.io
- **Tipping System**: Send tips via Stripe with saved cards and refund support
- **Report System**: AI-moderated user reports with Gemini integration
- **Progress Export**: Download session history as PDF
- **Leaderboard**: View top-rated users in the community

### Admin Features
- **Dashboard**: KPI statistics, growth charts, category distribution, AI health monitoring
- **User Management**: Create, warn, suspend, ban, delete users with email notifications
- **Listing Management**: Activate, pause, close listings
- **Report Management**: AI-reviewed reports with penalty actions
- **Category & Skills Management**: CRUD operations for skill taxonomy
- **Payment Management**: View transactions, process refunds
- **Match Weights Configuration**: Fine-tune matching algorithm weights

## Tech Stack

- **Backend**: Node.js 20 + Express.js
- **Frontend**: EJS Templating + Bootstrap 5 + SweetAlert2
- **Database**: MySQL 8 with Sequelize ORM
- **Real-time**: Socket.io for messaging and session updates
- **AI Service**: Google Gemini AI (Content Generation & Moderation)
- **Payments**: Stripe API (Payment Intents, Refunds, Saved Cards)
- **Email**: Nodemailer for transactional emails
- **Security**: Passport.js, Helmet, CSRF, Rate Limiting, bcrypt
- **PDF**: PDFKit for progress reports

## Prerequisites

- Node.js 20 or higher
- MySQL 8.0 or higher
- Stripe CLI (for local webhook testing)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skillswap-my
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   copy env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=skillswap_my
   DB_USER=root
   DB_PASSWORD=your_password
   SESSION_SECRET=your_session_secret
   
   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_key
   
   # Email (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_app_password
   ```

4. **Create MySQL database**
   ```sql
   CREATE DATABASE skillswap_my CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Seed the database**
   ```bash
   npm run seed
   ```

7. **Start Stripe webhook listener** (separate terminal)
   ```bash
   .\stripe.exe listen --forward-to localhost:3000/webhook
   ```

8. **Start the application**
   ```bash
   npm run dev
   ```

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skillswap.my | Admin@123 |
| User | user1@test.com | Test@123 |

## Project Structure

```
skillswap-my/
├── src/
│   ├── config/          # Database, logger, passport config
│   ├── models/          # Sequelize models (17 models)
│   ├── migrations/      # Database migrations
│   ├── seeders/         # Database seeders
│   ├── routes/          # Express routes (15 route files)
│   ├── services/        # Business logic (matching, notifications)
│   ├── middlewares/     # Auth, validation, rate limiting
│   └── views/           # EJS templates
├── public/              # Static assets (CSS, JS, Images)
├── uploads/             # User uploaded files
├── logs/                # Application logs
├── tests/               # Test files
├── utils/               # Utility functions (mailer)
├── app.js               # Main application entry
└── package.json         # Dependencies and scripts
```

## Database Models

| Model | Description |
|-------|-------------|
| User | User accounts with auth, profile, moderation fields |
| Category | Skill categories (Programming, Languages, etc.) |
| Skill | Individual skills belonging to categories |
| UserSkill | Junction table for user skills (teach/learn, level) |
| Availability | Weekly time slots |
| Listing | Skill offerings with teach/learn skills |
| LearningSession | Session workflow with verification codes |
| Rating | 4-criteria ratings (communication, skill, attitude, punctuality) |
| MessageThread | Conversation containers |
| Message | Individual messages |
| Notification | In-app notifications |
| Transaction | Stripe payment records |
| Invoice | Generated invoices |
| Report | User reports with AI moderation |
| CalculatorWeight | Matching algorithm weights |

## API Routes

### Authentication (`/auth`)
- `POST /register` - Create account with email verification
- `POST /login` - Authenticate user
- `GET /logout` - End session
- `POST /forgot` - Request password reset
- `POST /reset/:token` - Reset password
- `GET /activate/:token` - Verify email

### Profile (`/profile`)
- `GET /` - View profile with stats
- `POST /update` - Update profile (with image upload)
- `POST /skills` - Add skill
- `DELETE /skills/:id` - Remove skill
- `POST /availability` - Add availability
- `DELETE /availability/:id` - Remove availability
- `GET /progress/export` - Download PDF report

### Listings (`/listings`)
- `GET /` - Browse active listings
- `POST /create` - Create listing
- `POST /:id/edit` - Update listing
- `POST /:id/pause` - Pause listing
- `POST /:id/activate` - Activate listing
- `POST /:id/delete` - Delete listing

### Sessions (`/sessions`)
- `GET /` - View all sessions
- `POST /request` - Request session
- `POST /quick-request` - Auto-schedule session
- `POST /:id/confirm` - Accept request (generates code)
- `POST /:id/verify-code` - Start session with code
- `POST /:id/end` - End session
- `POST /:id/cancel` - Cancel session

### Tips (`/tips`)
- `GET /` - Tips history
- `POST /create-payment-intent` - Initiate payment
- `POST /quick-pay` - Pay with saved card
- `GET /saved-cards` - List saved payment methods

### Admin (`/admin`)
- `GET /` - Dashboard with KPIs
- `GET /users` - Manage users
- `POST /users/:id/suspend` - Suspend user
- `POST /users/:id/toggle-ban` - Ban/unban user
- `POST /users/:id/warn` - Send warning
- `GET /reports` - View reports
- `POST /reports/:id/action` - Resolve with penalty
- `GET /categories` - Manage categories
- `GET /skills` - Manage skills
- `GET /weights` - Configure match weights
- `GET /payments` - View transactions
- `POST /payments/:id/refund` - Process refund

## Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **Session Security**: Secure cookies, SameSite strict
- **CSRF Protection**: All forms protected
- **Rate Limiting**: 5 attempts per 15 minutes for auth
- **Input Validation**: Joi schema validation
- **Content Security Policy**: Helmet CSP headers
- **SQL Injection Protection**: Sequelize ORM parameterized queries
- **XSS Protection**: HTML sanitization
- **Role-based Access**: Admin middleware for protected routes
- **Force Logout**: Socket.io for banned/suspended users

## Development

### Running in Development
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Database Operations
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed

# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Undo last migration
npx sequelize-cli db:migrate:undo
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production MySQL database
3. Set secure session secret (32+ characters)
4. Configure Stripe live keys
5. Set up SMTP for production emails
6. Use PM2 or Docker for process management
7. Configure nginx as reverse proxy
8. Enable HTTPS with SSL certificate

## License

MIT License

---

**SkillSwap MY** - Connecting Malaysians through skill exchange 🇲🇾