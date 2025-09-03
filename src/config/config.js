require('dotenv').config();
const mysql2 = require('mysql2');

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'skillswap_my',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: console.log,
    define: { timestamps: true, underscored: true }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: { timestamps: true, underscored: true }
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'skillswap_my',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true }
  }
};
