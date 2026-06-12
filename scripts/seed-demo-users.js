const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const demoProfiles = [
  {
    prefix: 'DEMO_USER',
    birthDate: '1996-08-12',
    gender: 'Male',
    profession: 'Creative Director',
    height: '6\'0"',
    city: 'Mumbai',
    interests: ['Design', 'Photography', 'Art', 'Fitness'],
    personalityWords: ['Ambitious', 'Creative', 'Outgoing'],
    hobbies: ['Cycling', 'Sketching', 'Specialty Coffee'],
    bio: 'Storyteller and design enthusiast. Looking for someone to explore Mumbai galleries and find the best street food with. Hit me up if you appreciate a good playlist!',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=600&fit=crop'
    ],
    plan: 'free',
    isVerified: 1,
  },
  {
    prefix: 'DAVID_USER',
    birthDate: '1995-04-22',
    gender: 'Male',
    profession: 'Software Engineer',
    height: '5\'11"',
    city: 'Bangalore',
    interests: ['Coding', 'Gaming', 'Sci-Fi', 'Travel'],
    personalityWords: ['Introvert', 'Analytical', 'Caring'],
    hobbies: ['Guitar', 'Hiking', 'Cooking'],
    bio: 'Builds software by day, reads fantasy novels by night. Always down for a spontaneous trek or a quiet coffee session. Looking for someone to share ideas and stories.',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&h=600&fit=crop'
    ],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    prefix: 'SARAH_USER',
    birthDate: '1997-11-05',
    gender: 'Female',
    profession: 'Product Designer',
    height: '5\'6"',
    city: 'Delhi',
    interests: ['UI/UX', 'Fashion', 'Yoga', 'Travel'],
    personalityWords: ['Empathetic', 'Curious', 'Cheerful'],
    hobbies: ['Painting', 'Baking', 'Trekking'],
    bio: 'Obsessed with clean designs and matcha lattes. Looking for a genuine connection to share hikes, gallery walks, and warm conversations. Let\'s get boba!',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1534751516642-a131fed10495?w=600&h=600&fit=crop'
    ],
    plan: 'gold',
    isVerified: 1,
  },
  {
    prefix: 'PRIYA_USER',
    birthDate: '1998-03-14',
    gender: 'Female',
    profession: 'Journalist',
    height: '5\'4"',
    city: 'Delhi',
    interests: ['Writing', 'Literature', 'Politics', 'Cafes'],
    personalityWords: ['Expressive', 'Witty', 'Independent'],
    hobbies: ['Reading', 'Guitar', 'Photography'],
    bio: 'Always asking questions and looking for stories. Love listening to indie rock and finding hidden-gem bookstores. Looking for someone intellectually curious and fun.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=600&fit=crop'
    ],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    prefix: 'ELENA_USER',
    birthDate: '1996-09-30',
    gender: 'Female',
    profession: 'Fitness Coach',
    height: '5\'8"',
    city: 'Goa',
    interests: ['Nutrition', 'Surfing', 'Music Festivals', 'Dancing'],
    personalityWords: ['Energetic', 'Disciplined', 'Adventurous'],
    hobbies: ['Gym', 'Surfing', 'Running'],
    bio: 'Life is better by the ocean. Yoga instructor and beach lover. Looking for someone active who can match my energy and loves sunset beach walks.',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&h=600&fit=crop'
    ],
    plan: 'gold',
    isVerified: 1,
  },
  {
    prefix: 'MARCUS_USER',
    birthDate: '1994-07-15',
    gender: 'Male',
    profession: 'Chef',
    height: '6\'1"',
    city: 'Pune',
    interests: ['Culinary Arts', 'Wine', 'Music', 'Gardening'],
    personalityWords: ['Passionate', 'Warm', 'Humorous'],
    hobbies: ['Cooking', 'Playing Piano', 'Cycling'],
    bio: 'Making the world a tastier place, one dish at a time. I love hosting dinners for friends and making people laugh. Looking for my partner in culinary adventures.',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=600&h=600&fit=crop'
    ],
    plan: 'free',
    isVerified: 0,
  },
  {
    prefix: 'AISHA_USER',
    birthDate: '1999-01-20',
    gender: 'Female',
    profession: 'Architect',
    height: '5\'5"',
    city: 'Mumbai',
    interests: ['Design', 'Urbanism', 'Cinema', 'Museums'],
    personalityWords: ['Quiet', 'Observant', 'Creative'],
    hobbies: ['Sketching', 'Swimming', 'Photography'],
    bio: 'Fascinated by high ceilings, old buildings, and modern design. Looking for someone to walk around Mumbai city and talk about architecture and books.',
    photos: [
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=600&fit=crop'
    ],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    prefix: 'DIEGO_USER',
    birthDate: '1993-12-05',
    gender: 'Male',
    profession: 'Photographer',
    height: '5\'10"',
    city: 'Goa',
    interests: ['Lenses', 'Travel', 'Surfing', 'Music'],
    personalityWords: ['Chill', 'Adventurous', 'Loyal'],
    hobbies: ['Surfing', 'Drone Video', 'Camping'],
    bio: 'Capturing moments and exploring new horizons. Live in a van by the beach. Let\'s go watch the sunset and capture some amazing memories together.',
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=600&h=600&fit=crop'
    ],
    plan: 'free',
    isVerified: 1,
  }
];

function env(key) {
  return process.env[key];
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME || 'dating_web_app',
  });

  console.log('Clearing existing demo profiles to prevent duplicates...');
  for (const profile of demoProfiles) {
    const id = env(`${profile.prefix}_ID`);
    if (id) {
      // Deleting messages and matches will cascade because of foreign key constraints
      await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    }
  }

  console.log('Seeding demo user accounts...');
  for (const profile of demoProfiles) {
    const id = env(`${profile.prefix}_ID`);
    const name = env(`${profile.prefix}_NAME`) || profile.prefix;
    const email = env(`${profile.prefix}_EMAIL`);
    const password = env(`${profile.prefix}_PASSWORD`) || 'Password123';
    
    if (!id || !email) {
      console.warn(`Skipping ${profile.prefix} because ID or email is not configured in .env`);
      continue;
    }

    const hash = await bcrypt.hash(password, 12);
    await connection.execute(
      `INSERT INTO users (
        id, name, email, password, birthDate, gender, profession, height, city,
        interests, personalityWords, bio, photos, hobbies, plan, status, role,
        isVerified, onboardingCompleted, isOnline, showOnlineStatus, showDistance, photosVisibleToNonMatches
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'user', ?, 1, 0, 1, 1, 1)`,
      [
        id,
        name,
        email,
        hash,
        profile.birthDate,
        profile.gender,
        profile.profession,
        profile.height,
        profile.city,
        JSON.stringify(profile.interests),
        JSON.stringify(profile.personalityWords),
        profile.bio,
        JSON.stringify(profile.photos),
        JSON.stringify(profile.hobbies),
        profile.plan,
        profile.isVerified,
      ]
    );
    console.log(`Seeded user: ${name} (${email})`);
  }

  // Seed some matches & messages
  const davidId = env('DAVID_USER_ID');
  const sarahId = env('SARAH_USER_ID');
  const priyaId = env('PRIYA_USER_ID');
  const elenaId = env('ELENA_USER_ID');
  const marcusId = env('MARCUS_USER_ID');

  if (davidId && sarahId && priyaId) {
    console.log('Seeding demo matches and conversations...');
    
    // 1. David & Sarah MATCHED match
    const match1Id = 'match-david-sarah';
    await connection.execute(
      `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
       VALUES (?, ?, ?, 'MATCHED', 0)
       ON DUPLICATE KEY UPDATE status = 'MATCHED'`,
      [match1Id, davidId, sarahId]
    );

    // Messages for David & Sarah
    const messages = [
      { id: 'msg-1', conversationId: match1Id, senderId: sarahId, receiverId: davidId, content: 'Hey David! I saw you like travel blogging. What\'s your favorite spot in India?' },
      { id: 'msg-2', conversationId: match1Id, senderId: davidId, receiverId: sarahId, content: 'Hey Sarah! Absolutely love Goa and the mountains of Himachal. How about you?' },
      { id: 'msg-3', conversationId: match1Id, senderId: sarahId, receiverId: davidId, content: 'Himachal is gorgeous! I went there last summer.' },
    ];

    for (const msg of messages) {
      await connection.execute(
        `INSERT INTO messages (id, conversationId, senderId, receiverId, content, isRead)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE content = VALUES(content)`,
        [msg.id, msg.conversationId, msg.senderId, msg.receiverId, msg.content]
      );
    }

    // 2. David & Priya MATCHED match
    const match2Id = 'match-david-priya';
    await connection.execute(
      `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
       VALUES (?, ?, ?, 'MATCHED', 1)
       ON DUPLICATE KEY UPDATE status = 'MATCHED'`,
      [match2Id, davidId, priyaId]
    );

    // Messages for David & Priya
    const messages2 = [
      { id: 'msg-4', conversationId: match2Id, senderId: priyaId, receiverId: davidId, content: 'Hi David! Loved your guitar hobby. What songs do you play?' },
      { id: 'msg-5', conversationId: match2Id, senderId: davidId, receiverId: priyaId, content: 'Hey Priya! Mostly acoustic indie rock covers. Do you play anything?' },
    ];

    for (const msg of messages2) {
      await connection.execute(
        `INSERT INTO messages (id, conversationId, senderId, receiverId, content, isRead)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE content = VALUES(content)`,
        [msg.id, msg.conversationId, msg.senderId, msg.receiverId, msg.content]
      );
    }

    // 3. Elena liked David (Elena -> David, status: PENDING, superlike)
    if (elenaId) {
      const match3Id = 'match-elena-david';
      await connection.execute(
        `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
         VALUES (?, ?, ?, 'PENDING', 1)
         ON DUPLICATE KEY UPDATE status = 'PENDING'`,
        [match3Id, elenaId, davidId]
      );
    }

    // 4. David liked Marcus (David -> Marcus, status: PENDING)
    if (marcusId) {
      const match4Id = 'match-david-marcus';
      await connection.execute(
        `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
         VALUES (?, ?, ?, 'PENDING', 0)
         ON DUPLICATE KEY UPDATE status = 'PENDING'`,
        [match4Id, davidId, marcusId]
      );
    }

    console.log('Demo matches and conversations successfully seeded.');
  }

  await connection.end();
  console.log('Seeding completed successfully!');
}

main().catch((error) => {
  console.error('Failed to seed demo profiles:', error.message);
  process.exit(1);
});
