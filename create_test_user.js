const { User, sequelize } = require('./src/models');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

async function createTestUser() {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const hash = await bcrypt.hash('password123', 10);

        // cleanup old debug user
        await User.destroy({ where: { email: 'debug_manual@example.com' } });

        const user = await User.create({
            name: 'Debug Manual',
            email: 'debug_manual@example.com',
            passwordHash: hash,
            activationToken: token,
            isVerified: false
        });

        const fs = require('fs');
        fs.writeFileSync('token.txt', token);
        console.log('Token written to token.txt');
    } catch (e) {
        console.error(e);
    } finally {
        // We shouldn't close sequelize here if we want the app to keep running? 
        // Actually this is a separate process.
        // But src/models/index.js might initialize a connection pool.
        // It's fine to exit.
    }
}

createTestUser();
