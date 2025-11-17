// scripts/create-database.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || ''
  });

  const dbName = process.env.DB_NAME || 'skillswap_my';
  
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ Database '${dbName}' created or already exists`);
  } catch (error) {
    console.error('Error creating database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createDatabase();
