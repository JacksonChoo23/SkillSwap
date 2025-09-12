# Copilot Instructions for SkillSwap MY

Welcome to the SkillSwap MY codebase! This document provides essential guidance for AI coding agents to be productive in this project.

## Big Picture Architecture

SkillSwap MY is a peer skill exchange platform built with the following major components:

- **Backend**: Node.js + Express for API and server-side logic.
- **Views**: EJS templates for server-rendered HTML, styled with Bootstrap 5.
- **Database**: MySQL 8, managed via Sequelize ORM.
- **Authentication**: Passport.js for secure user authentication.
- **Security**: Includes Helmet, CSRF protection, and rate limiting.

### Key Data Flows
- **User Authentication**: Handled via `src/config/passport.js`.
- **Skill Matching**: Implemented in `src/services/matchService.js` and exposed via `/match` route.
- **Messaging**: Managed through `src/routes/messages.js` and related views.
- **Session Management**: Scheduled and tracked via `src/routes/sessions.js`.

## Developer Workflows

### Running the Project
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up the database:
   ```bash
   npx sequelize-cli db:migrate
   ```
3. Start the server:
   ```bash
   npm start
   ```

### Testing
- Unit tests are located in the `tests/` directory.
- Run tests with:
  ```bash
  npm test
  ```

### Debugging
- Use `console.log` for quick debugging.
- Logs are managed via Winston (`src/config/logger.js`).

## Project-Specific Conventions

### EJS Layouts
- Use `express-ejs-layouts` with `layouts/main.ejs` as the default layout.
- Include partials using `<%- include('partials/header') %>`.

### Validation
- Input validation is handled via Joi in `src/middlewares/validate.js`.
- Always allow unknown keys to prevent CSRF token validation errors.

### Matching Engine
- Matching logic is implemented in `src/services/matchService.js`.
- Matches are scored based on tag intersections and availability overlap.

## Integration Points

### External Dependencies
- **WhatsApp Integration**: Deep links for messaging.
- **Sequelize**: ORM for database interactions.

### Cross-Component Communication
- Routes in `src/routes/` interact with services in `src/services/`.
- Views in `src/views/` consume data passed from routes.

## Key Files and Directories
- `app.js`: Main application entry point.
- `src/config/`: Configuration files for database, logger, and authentication.
- `src/routes/`: Route handlers for various features.
- `src/services/`: Business logic and utilities.
- `src/views/`: EJS templates for rendering HTML.
- `tests/`: Unit tests for services and routes.

## Examples

### Adding a New Route
1. Create a new file in `src/routes/`.
2. Register the route in `app.js`.
3. Add corresponding views in `src/views/` if needed.

### Writing a Test
1. Add a test file in `tests/`.
2. Use Jest for assertions.
3. Mock dependencies as needed.

---

Feel free to update this document as the project evolves!
