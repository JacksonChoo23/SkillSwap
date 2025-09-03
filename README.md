# SkillSwap MY

A peer skill exchange platform for Malaysia where users can teach and learn skills from each other in a fair, time-for-time exchange system.

## Features

- **User Authentication**: Secure registration, login, and password reset
- **Profile Management**: Edit bio, location, skills, and availability
- **Skill Matching**: Find compatible skill exchange partners
- **Skill Value Calculator**: Fair time-for-time exchange calculations
- **Messaging System**: Internal message board for communication
- **Session Management**: Schedule, confirm, and complete skill sessions
- **Rating System**: Rate sessions on communication, skill, attitude, and punctuality
- **Admin Panel**: Manage users, listings, reports, and system settings
- **Content Moderation**: Automatic content filtering and admin review
- **WhatsApp Integration**: Direct messaging via WhatsApp deep links

## Tech Stack

- **Backend**: Node.js 20 + Express
- **Views**: EJS (server-rendered) + Bootstrap 5
- **Database**: MySQL 8 with Sequelize ORM
- **Authentication**: Passport.js (local) with bcrypt
- **Security**: Helmet, CSRF protection, rate limiting, input validation
- **Logging**: Morgan (dev) + Winston (prod)

## Prerequisites

- Node.js 20 or higher
- MySQL 8.0 or higher
- Windows 11 (or compatible OS)

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
   
   Edit `.env` file with your database credentials and other settings:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=skillswap_my
   DB_USER=root
   DB_PASSWORD=your_password_here
   SESSION_SECRET=your_session_secret_here
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

7. **Start the application**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Default Admin Account

- **Email**: admin@skillswap.my
- **Password**: Admin@123

## Project Structure

```
skillswap-my/
├── src/
│   ├── config/          # Database, logger, passport config
│   ├── models/          # Sequelize models
│   ├── migrations/      # Database migrations
│   ├── seeders/         # Database seeders
│   ├── routes/          # Express routes
│   ├── services/        # Business logic services
│   ├── middlewares/     # Custom middleware
│   └── views/           # EJS templates
├── public/              # Static assets
├── logs/                # Application logs
├── app.js              # Main application file
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Key Features Explained

### Matching Algorithm
The matching system uses a weighted scoring algorithm:
- **Tag Overlap Score (60%)**: Matches teach/learn skill intersections
- **Availability Overlap Score (40%)**: Matches weekly time slot overlaps
- Returns top 20 matches sorted by score

### Skill Value Calculator
Calculates fair time-for-time exchanges using:
- **Category Weights**: Different skill categories have different base values
- **Level Weights**: Beginner, intermediate, advanced levels affect value
- **Formula**: Value = Hours × Category Weight × Level Weight
- **Fair Exchange**: Suggests adjustments to achieve 1:1 value ratio

### Content Moderation
- **HTML Sanitization**: Removes potentially harmful HTML
- **Bad Word Filter**: Flags inappropriate content for admin review
- **Input Validation**: Joi schema validation for all forms
- **CSRF Protection**: Prevents cross-site request forgery

## API Endpoints

### Authentication
- `GET /auth/register` - Registration page
- `POST /auth/register` - Create account
- `GET /auth/login` - Login page
- `POST /auth/login` - Authenticate user
- `GET /auth/logout` - Logout user
- `GET /auth/forgot` - Forgot password page
- `POST /auth/forgot` - Send reset email
- `GET /auth/reset/:token` - Reset password page
- `POST /auth/reset/:token` - Update password

### Profile Management
- `GET /profile` - View/edit profile
- `POST /profile/update` - Update profile
- `POST /profile/skills` - Add skill
- `DELETE /profile/skills/:id` - Remove skill
- `POST /profile/availability` - Add availability
- `DELETE /profile/availability/:id` - Remove availability
- `POST /profile/privacy` - Toggle privacy

### Listings
- `GET /listings` - Browse listings
- `GET /listings/create` - Create listing page
- `POST /listings/create` - Create listing
- `GET /listings/:id` - View listing
- `GET /listings/:id/edit` - Edit listing page
- `POST /listings/:id/edit` - Update listing
- `DELETE /listings/:id` - Delete listing

### Matching & Browsing
- `GET /match` - Find matches
- `GET /browse` - Browse users
- `GET /browse/user/:id` - View user profile

### Messaging
- `GET /messages` - Message threads
- `GET /messages/thread/:id` - View thread
- `POST /messages/thread/:id` - Send message
- `POST /messages/start/:listingId` - Start conversation

### Sessions
- `GET /sessions` - My sessions
- `POST /sessions/request` - Request session
- `POST /sessions/:id/confirm` - Confirm session
- `POST /sessions/:id/complete` - Complete session
- `POST /sessions/:id/cancel` - Cancel session
- `GET /sessions/:id` - Session details

### Ratings
- `POST /ratings/:sessionId` - Rate session

### Calculator
- `GET /calculator` - Calculator page
- `POST /calculator/calculate` - Calculate fair exchange

### Admin (Admin only)
- `GET /admin` - Admin dashboard
- `GET /admin/users` - Manage users
- `POST /admin/users/:id/toggle-suspend` - Suspend/unsuspend user
- `GET /admin/listings` - Manage listings
- `POST /admin/listings/:id/:action` - Approve/reject listing
- `GET /admin/reports` - Manage reports
- `POST /admin/reports/:id/close` - Close report
- `GET /admin/categories` - Manage categories
- `POST /admin/categories` - Add category
- `POST /admin/categories/:id/toggle` - Toggle category
- `GET /admin/weights` - Manage calculator weights
- `POST /admin/weights/:id` - Update weight

## Database Schema

### Core Tables
- `users` - User accounts and profiles
- `categories` - Skill categories
- `skills` - Available skills
- `user_skills` - User skill associations (teach/learn)
- `availabilities` - Weekly time slots
- `listings` - Skill listings
- `message_threads` - Message conversations
- `messages` - Individual messages
- `sessions` - Skill exchange sessions
- `ratings` - Session ratings
- `reports` - User reports
- `tip_tokens` - Simulated tipping
- `calculator_weights` - Skill value weights

## Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **Session Security**: Secure cookies, SameSite strict
- **CSRF Protection**: All forms protected
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Joi schema validation
- **Content Security Policy**: Helmet CSP headers
- **SQL Injection Protection**: Sequelize ORM
- **XSS Protection**: HTML sanitization

## Development

### Running Tests
```bash
npm test
```

### Database Operations
```bash
# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Create new seeder
npx sequelize-cli seed:generate --name seeder-name

# Run specific migration
npx sequelize-cli db:migrate --to migration-name.js

# Undo last migration
npx sequelize-cli db:migrate:undo
```

### Logs
- Development: Console output with Morgan
- Production: Winston file logging in `logs/` directory

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Configure production database
3. Set secure session secret
4. Configure logging
5. Set up reverse proxy (nginx recommended)
6. Use PM2 or similar process manager

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please contact the development team.

---

**SkillSwap MY** - Connecting Malaysians through skill exchange 