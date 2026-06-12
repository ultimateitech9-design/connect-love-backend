const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME || 'dating_web_app',
  });

  console.log('Forcing matches with Diego (p4) for David (m1) and Demo User (demo-user)...');

  // Match David and Diego
  await connection.execute(
    `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
     VALUES (?, ?, ?, 'MATCHED', 0)
     ON DUPLICATE KEY UPDATE status = 'MATCHED'`,
    ['match-david-diego', 'm1', 'p4']
  );

  // Match Demo User and Diego
  await connection.execute(
    `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
     VALUES (?, ?, ?, 'MATCHED', 0)
     ON DUPLICATE KEY UPDATE status = 'MATCHED'`,
    ['match-demo-diego', 'demo-user', 'p4']
  );

  // Match David and Marcus
  await connection.execute(
    `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
     VALUES (?, ?, ?, 'MATCHED', 0)
     ON DUPLICATE KEY UPDATE status = 'MATCHED'`,
    ['match-david-marcus', 'm1', 'p2']
  );

  // Match Demo User and Marcus
  await connection.execute(
    `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
     VALUES (?, ?, ?, 'MATCHED', 0)
     ON DUPLICATE KEY UPDATE status = 'MATCHED'`,
    ['match-demo-marcus', 'demo-user', 'p2']
  );

  console.log('Diego and Marcus are now successfully matched with David and Demo User!');
  await connection.end();
}

main().catch((error) => {
  console.error('Failed to force match:', error.message);
  process.exit(1);
});
