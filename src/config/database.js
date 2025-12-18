// src/config/database.js
const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');
const path = require('path');

let cfg = {};
try {
  // 尝试加载 config/config.js，若无也没关系
  const allCfg = require(path.join(__dirname, '..', '..', 'config', 'config.js'));
  const env = process.env.NODE_ENV || 'development';
  cfg = allCfg[env] || {};
} catch (e) {
  cfg = {};
}

// 环境变量优先
const DB_USER = process.env.DB_USER || cfg.username || 'root';
const DB_PASS = process.env.DB_PASS || cfg.password || '';
const DB_NAME = process.env.DB_NAME || cfg.database || 'skillswap_my';
const DB_SOCKET = process.env.DB_SOCKET || ''; // '/cloudsql/PROJECT:REGION:INSTANCE'
const DB_HOST = process.env.DB_HOST || cfg.host || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || cfg.port || 3306);

const logger = require('./logger');

const options = {
  dialect: 'mysql',
  dialectModule: mysql2,
  logging: process.env.NODE_ENV === 'development'
    ? (msg) => {
      // Normalize whitespace and trim long SQL for readability
      const single = String(msg).replace(/\s+/g, ' ').trim();
      logger.debug(single);
    }
    : (cfg.logging || false),
  // Connection pool configuration - configurable via env vars for production tuning
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || cfg.pool?.max || 10,
    min: parseInt(process.env.DB_POOL_MIN) || cfg.pool?.min || 2,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || cfg.pool?.acquire || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || cfg.pool?.idle || 10000
  },
  define: cfg.define || { timestamps: true, underscored: true }
};

// 如果提供了 unix socket，就用 socketPath
if (DB_SOCKET) {
  options.dialectOptions = Object.assign({}, options.dialectOptions, { socketPath: DB_SOCKET });
} else {
  options.host = DB_HOST;
  options.port = DB_PORT;
}

// 支持 sqlite 回退仅在明确指定时使用（避免 Cloud Run 意外回退）
if (process.env.FORCE_SQLITE === 'true') {
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.SQLITE_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: { timestamps: true, underscored: true }
  });
  module.exports = { sequelize: sqlite };
} else {
  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, options);
  module.exports = { sequelize };
}
