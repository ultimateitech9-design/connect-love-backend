const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'dating_web_app',
  });

  // Get demo user IDs
  const sarahId = process.env.SARAH_USER_ID || 'm2';
  const priyaId = process.env.PRIYA_USER_ID || 'm3';
  const elenaId = process.env.ELENA_USER_ID || 'p1';
  const davidId = process.env.DAVID_USER_ID || 'm1';

  // Find all real users (excluding admin/demo/support)
  const [realUsers] = await connection.execute(
    `SELECT id, name FROM users 
     WHERE role = 'user' AND id NOT IN (?, ?, ?, ?, ?, ?, ?, ?, 'demo-user')`,
    ['m1', 'm2', 'm3', 'p1', 'p2', 'p3', 'p4', 'admin-1']
  );

  console.log(`Found ${realUsers.length} real users to inject test data into.`);

  for (const user of realUsers) {
    console.log(`Injecting data for ${user.name} (${user.id})...`);

    // 1. Give them some pending likes (Likes received)
    // Sarah likes them
    await connection.execute(
      `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
       SELECT ?, ?, ?, 'PENDING', 0
       WHERE NOT EXISTS (SELECT 1 FROM matches WHERE senderId = ? AND receiverId = ?)`,
      [crypto.randomUUID(), sarahId, user.id, sarahId, user.id]
    );

    // Elena SUPER LIKES them
    await connection.execute(
      `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
       SELECT ?, ?, ?, 'PENDING', 1
       WHERE NOT EXISTS (SELECT 1 FROM matches WHERE senderId = ? AND receiverId = ?)`,
      [crypto.randomUUID(), elenaId, user.id, elenaId, user.id]
    );

    // 2. Give them an active mutual match with Priya
    let [existingMatches] = await connection.execute(
      `SELECT id FROM matches WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)`,
      [priyaId, user.id, user.id, priyaId]
    );
    let mutualMatchId;
    
    if (existingMatches.length > 0) {
      mutualMatchId = existingMatches[0].id;
      await connection.execute(`UPDATE matches SET status = 'MATCHED' WHERE id = ?`, [mutualMatchId]);
    } else {
      mutualMatchId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
         VALUES (?, ?, ?, 'MATCHED', 0)`,
        [mutualMatchId, priyaId, user.id]
      );
    }

    // Add some messages from Priya
    const messages = [
      { id: crypto.randomUUID(), content: `Hey ${user.name}! I loved your profile, especially the photos.`, senderId: priyaId },
      { id: crypto.randomUUID(), content: `What are you up to this weekend? Any plans?`, senderId: priyaId }
    ];

    for (const msg of messages) {
      await connection.execute(
        `INSERT INTO messages (id, conversationId, senderId, receiverId, content, isRead)
         VALUES (?, ?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE content = VALUES(content)`,
        [msg.id, mutualMatchId, msg.senderId, user.id, msg.content]
      );
    }
    
    // 3. Make them have already swiped left (passed) on David
    await connection.execute(
      `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
       SELECT ?, ?, ?, 'DECLINED', 0
       WHERE NOT EXISTS (SELECT 1 FROM matches WHERE senderId = ? AND receiverId = ?)`,
      [crypto.randomUUID(), user.id, davidId, user.id, davidId]
    );
  }

  console.log('Test data successfully seeded for all real users!');
  await connection.end();
}

main().catch((error) => {
  console.error('Failed to seed test data:', error.message);
  process.exit(1);
});
