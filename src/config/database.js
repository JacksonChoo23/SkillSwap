const { Sequelize } = require('sequelize');

// Use SQLite for development if no database is configured
const useSQLite = !process.env.DB_HOST && !process.env.DB_NAME;

const sequelize = useSQLite 
  ? new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'skillswap_my',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        define: {
          timestamps: true,
          underscored: true
        }
      }
    );

module.exports = { sequelize }; 