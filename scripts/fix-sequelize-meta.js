// scripts/fix-sequelize-meta.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixSequelizeMeta() {
  const dbName = process.env.DB_NAME || 'skillswap_my';
  
  // Connect without database first
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || ''
  });

  try {
    console.log(`Dropping database '${dbName}' to remove corrupted files...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    
    console.log(`Creating fresh database '${dbName}'...`);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    console.log('✓ Database recreated successfully. Run migrations now.');
  } catch (error) {
    console.error('Error fixing SequelizeMeta:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

fixSequelizeMeta();
