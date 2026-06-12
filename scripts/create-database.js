const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function quoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

async function main() {
  const database = process.env.DB_NAME || 'dating_web_app';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();
  console.log(`Database ready: ${database}`);
}

main().catch((error) => {
  console.error('Failed to create database:', error.message);
  process.exit(1);
});
