const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const stock = (seed, size = 800) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${size}&h=${size}&q=80`;

const users = [
  {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@connectlove.local',
    role: 'user',
    gender: 'female',
    birthDate: '1998-04-12',
    profession: 'Product Manager',
    height: `5'6"`,
    city: 'New York',
    bio: 'Here to test the full ConnectLove flow end-to-end.',
    interests: ['Coffee', 'Design', 'Travel'],
    personalityWords: ['Curious', 'Warm', 'Playful'],
    hobbies: ['Reading', 'Cooking', 'Hiking'],
    photos: [stock('1494790108377-be9c29b29330')],
    plan: 'gold',
    isVerified: 1,
  },
  {
    id: 'm1',
    name: 'David',
    email: 'david@example.com',
    role: 'user',
    gender: 'male',
    birthDate: '1998-06-10',
    profession: 'Software Engineer',
    height: `5'11"`,
    city: 'Brooklyn',
    bio: "Builder, jazz fan, and always searching for the city's best espresso.",
    interests: ['Tech', 'Jazz', 'Coffee'],
    personalityWords: ['Thoughtful', 'Funny', 'Focused'],
    hobbies: ['Coding', 'Cycling', 'Music'],
    photos: [stock('1500648767791-00dcc994a43e', 900)],
    plan: 'free',
    isVerified: 1,
  },
  {
    id: 'm2',
    name: 'Sarah',
    email: 'sarah@example.com',
    role: 'user',
    gender: 'female',
    birthDate: '2000-02-14',
    profession: 'Music Teacher',
    height: `5'5"`,
    city: 'Queens',
    bio: 'Piano, Sunday markets, and conversations that accidentally run for hours.',
    interests: ['Jazz', 'Food', 'Art'],
    personalityWords: ['Kind', 'Creative', 'Calm'],
    hobbies: ['Piano', 'Painting', 'Baking'],
    photos: [stock('1544005313-94ddf0286df2', 900)],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    id: 'm3',
    name: 'Priya',
    email: 'priya@example.com',
    role: 'user',
    gender: 'female',
    birthDate: '1996-09-21',
    profession: 'Doctor',
    height: `5'4"`,
    city: 'Jersey City',
    bio: 'Books, basil plants, and exactly one terrible pun per conversation.',
    interests: ['Reading', 'Yoga', 'Cooking'],
    personalityWords: ['Grounded', 'Sharp', 'Loyal'],
    hobbies: ['Yoga', 'Gardening', 'Reading'],
    photos: [stock('1487412720507-e7ab37603c6f', 900)],
    plan: 'free',
    isVerified: 1,
  },
  {
    id: 'p1',
    name: 'Elena',
    email: 'elena@example.com',
    role: 'user',
    gender: 'female',
    birthDate: '2002-01-18',
    profession: 'Architect',
    height: `5'7"`,
    city: 'Manhattan',
    bio: 'Lover of slow mornings and big ideas.',
    interests: ['Design', 'Coffee', 'Museums'],
    personalityWords: ['Curious', 'Calm', 'Witty'],
    hobbies: ['Sketching', 'Museums', 'Coffee'],
    photos: [stock('1494790108377-be9c29b29330', 900)],
    plan: 'gold',
    isVerified: 1,
  },
  {
    id: 'p2',
    name: 'Marcus',
    email: 'marcus@example.com',
    role: 'user',
    gender: 'male',
    birthDate: '1997-07-03',
    profession: 'Product Designer',
    height: `6'0"`,
    city: 'Hoboken',
    bio: 'Surf at dawn, ship by noon.',
    interests: ['Surf', 'Vinyl', 'Ramen'],
    personalityWords: ['Driven', 'Warm', 'Playful'],
    hobbies: ['Surfing', 'Records', 'Cooking'],
    photos: [stock('1500648767791-00dcc994a43e', 900)],
    plan: 'free',
    isVerified: 1,
  },
  {
    id: 'p3',
    name: 'Aisha',
    email: 'aisha@example.com',
    role: 'user',
    gender: 'female',
    birthDate: '1999-11-30',
    profession: 'Doctor',
    height: `5'6"`,
    city: 'Newark',
    bio: 'Books, basil plants, and bad puns.',
    interests: ['Reading', 'Yoga', 'Cooking'],
    personalityWords: ['Kind', 'Sharp', 'Grounded'],
    hobbies: ['Reading', 'Yoga', 'Cooking'],
    photos: [stock('1438761681033-6461ffad8d80', 900)],
    plan: 'free',
    isVerified: 0,
  },
  {
    id: 'p4',
    name: 'Diego',
    email: 'diego@example.com',
    role: 'user',
    gender: 'male',
    birthDate: '1995-03-09',
    profession: 'Photographer',
    height: `5'10"`,
    city: 'Austin',
    bio: 'Chasing the right light.',
    interests: ['Film', 'Hiking', 'Coffee'],
    personalityWords: ['Creative', 'Quiet', 'Loyal'],
    hobbies: ['Photography', 'Travel', 'Hiking'],
    photos: [stock('1507003211169-0a1dd7228f2d', 900)],
    plan: 'gold',
    isVerified: 1,
  },
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@connectlove.local',
    role: 'admin',
    gender: 'prefer-not',
    birthDate: '1990-01-01',
    profession: 'Admin',
    height: null,
    city: 'Remote',
    bio: 'Platform administrator.',
    interests: ['Operations'],
    personalityWords: ['Organized'],
    hobbies: ['Dashboards'],
    photos: [],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    id: 'marketing-1',
    name: 'Marketing Manager',
    email: 'marketing@connectlove.local',
    role: 'marketing',
    gender: 'prefer-not',
    birthDate: '1992-01-01',
    profession: 'Marketing',
    height: null,
    city: 'Remote',
    bio: 'Marketing dashboard account.',
    interests: ['Campaigns'],
    personalityWords: ['Creative'],
    hobbies: ['Reports'],
    photos: [],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    id: 'finance-1',
    name: 'Finance Manager',
    email: 'finance@connectlove.local',
    role: 'finance',
    gender: 'prefer-not',
    birthDate: '1991-01-01',
    profession: 'Finance',
    height: null,
    city: 'Remote',
    bio: 'Finance dashboard account.',
    interests: ['Revenue'],
    personalityWords: ['Precise'],
    hobbies: ['Numbers'],
    photos: [],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    id: 'sales-1',
    name: 'Sales Manager',
    email: 'sales@connectlove.local',
    role: 'sales',
    gender: 'prefer-not',
    birthDate: '1993-01-01',
    profession: 'Sales',
    height: null,
    city: 'Remote',
    bio: 'Sales dashboard account.',
    interests: ['Growth'],
    personalityWords: ['Driven'],
    hobbies: ['Planning'],
    photos: [],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    id: 'support-1',
    name: 'Support Lead',
    email: 'support@connectlove.local',
    role: 'support',
    gender: 'prefer-not',
    birthDate: '1994-01-01',
    profession: 'Support',
    height: null,
    city: 'Remote',
    bio: 'Support dashboard account.',
    interests: ['Trust'],
    personalityWords: ['Patient'],
    hobbies: ['Helping'],
    photos: [],
    plan: 'platinum',
    isVerified: 1,
  },
  {
    id: 'super-admin-1',
    name: 'Super Admin',
    email: 'superadmin@connectlove.local',
    role: 'super_admin',
    gender: 'prefer-not',
    birthDate: '1988-01-01',
    profession: 'Super Admin',
    height: null,
    city: 'Remote',
    bio: 'Platform owner account.',
    interests: ['Security'],
    personalityWords: ['Decisive'],
    hobbies: ['Systems'],
    photos: [],
    plan: 'platinum',
    isVerified: 1,
  },
];

const matches = [
  ['match-demo-m1', 'demo-user', 'm1', 'MATCHED', 0],
  ['match-demo-m2', 'demo-user', 'm2', 'MATCHED', 0],
  ['match-p1-demo', 'p1', 'demo-user', 'PENDING', 0],
  ['match-demo-p2', 'demo-user', 'p2', 'PENDING', 1],
];

const messages = [
  ['msg-demo-1', 'match-demo-m1', 'm1', 'demo-user', "Hey! How's your week going?", 0],
  ['msg-demo-2', 'match-demo-m1', 'demo-user', 'm1', 'Pretty good. Testing the app flow today.', 1],
  ['msg-demo-3', 'match-demo-m2', 'm2', 'demo-user', 'Hey, I noticed we both love jazz...', 0],
];

const plans = [
  ['plan-free', 'free', 'Basic Access', 0, 'USD', ['50 daily likes', 'Basic discovery filters'], 'active', 1],
  ['plan-gold', 'gold', 'Premium Match', 9.99, 'USD', ['Unlimited likes', '5 super likes', 'Passport mode'], 'active', 2],
  ['plan-platinum', 'platinum', 'Ultimate', 29.99, 'USD', ['Priority likes', 'See who likes you', 'VIP badge'], 'active', 3],
];

const payments = [
  ['pay-1', 'demo-user', 'Premium Match', 9.99, 'successful'],
  ['pay-2', 'm2', 'Ultimate', 29.99, 'successful'],
  ['pay-3', 'p1', 'Premium Match', 9.99, 'pending'],
  ['pay-4', 'p4', 'Premium Match', 9.99, 'refunded'],
];

const verificationRequests = [
  ['ver-1', 'p3', 'Government ID', 'high', 'pending', ['front-id-placeholder', 'selfie-placeholder']],
  ['ver-2', 'm2', 'Passport', 'normal', 'under_review', ['passport-placeholder']],
];

const notifications = [
  ['notif-1', 'Welcome flow', 'Email', 'New users', 'active'],
  ['notif-2', 'Premium upgrade', 'Push', 'Free users', 'scheduled'],
  ['notif-3', 'Safety reminder', 'In-app', 'All users', 'active'],
];

const auditLogs = [
  ['log-1', 'super-admin-1', 'Super Admin', 'Logged in to super-admin dashboard', '127.0.0.1', 'login', 'Auth'],
  ['log-2', 'admin-1', 'Admin User', 'Reviewed user management dashboard', '127.0.0.1', 'view', 'User Management'],
  ['log-3', 'support-1', 'Support Lead', 'Opened support ticket queue', '127.0.0.1', 'view', 'Support'],
  ['log-4', 'finance-1', 'Finance Manager', 'Exported payment report', '127.0.0.1', 'export', 'Payments'],
];

const roles = [
  ['role-super-admin', 'Super Admin', 42, 'Active'],
  ['role-admin', 'Admin', 32, 'Active'],
  ['role-marketing', 'Marketing', 18, 'Active'],
  ['role-finance', 'Finance', 18, 'Active'],
  ['role-sales', 'Sales', 16, 'Active'],
  ['role-support', 'Support', 20, 'Active'],
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'dating_web_app',
  });

  const passwordHash = await bcrypt.hash('Password123', 12);
  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);

  for (const user of users) {
    const hash = user.role === 'user' ? passwordHash : adminPasswordHash;
    await connection.execute(
      `INSERT INTO users (
        id, name, email, password, birthDate, gender, profession, height, city, bio,
        interests, personalityWords, hobbies, photos, plan, status, role, isVerified,
        onboardingCompleted, showOnlineStatus, showDistance, notifyMessages, notifyMatches, notifyPush
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 1, 1, 1, 1, 1, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        birthDate = VALUES(birthDate),
        gender = VALUES(gender),
        profession = VALUES(profession),
        height = VALUES(height),
        city = VALUES(city),
        bio = VALUES(bio),
        interests = VALUES(interests),
        personalityWords = VALUES(personalityWords),
        hobbies = VALUES(hobbies),
        photos = VALUES(photos),
        plan = VALUES(plan),
        role = VALUES(role),
        isVerified = VALUES(isVerified),
        onboardingCompleted = VALUES(onboardingCompleted)`,
      [
        user.id,
        user.name,
        user.email,
        hash,
        user.birthDate,
        user.gender,
        user.profession,
        user.height,
        user.city,
        user.bio,
        JSON.stringify(user.interests),
        JSON.stringify(user.personalityWords),
        JSON.stringify(user.hobbies),
        JSON.stringify(user.photos),
        user.plan,
        user.role,
        user.isVerified,
      ],
    );
  }

  for (const [id, senderId, receiverId, status, isSuperLike] of matches) {
    await connection.execute(
      `INSERT INTO matches (id, senderId, receiverId, status, isSuperLike)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), isSuperLike = VALUES(isSuperLike)`,
      [id, senderId, receiverId, status, isSuperLike],
    );
  }

  for (const [id, conversationId, senderId, receiverId, content, isRead] of messages) {
    await connection.execute(
      `INSERT INTO messages (id, conversationId, senderId, receiverId, content, isRead)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content), isRead = VALUES(isRead)`,
      [id, conversationId, senderId, receiverId, content, isRead],
    );
  }

  const [contactRows] = await connection.query('SELECT COUNT(*) AS total FROM contacts');
  if (contactRows[0].total === 0) {
    await connection.execute(
      'INSERT INTO contacts (name, email, subject, message, status) VALUES (?, ?, ?, ?, ?)',
      ['Elena Park', 'elena@example.com', 'Verification stuck', 'My ID verification has been pending for two days.', 'open'],
    );
    await connection.execute(
      'INSERT INTO contacts (name, email, subject, message, status) VALUES (?, ?, ?, ?, ?)',
      ['Marcus Lee', 'marcus@example.com', 'Refund request', 'I need help with a premium billing refund.', 'reviewing'],
    );
  }

  for (const [id, name, displayName, price, currency, features, status, sortOrder] of plans) {
    await connection.execute(
      `INSERT INTO subscription_plans (id, name, displayName, price, currency, features, status, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE displayName = VALUES(displayName), price = VALUES(price), features = VALUES(features), status = VALUES(status), sortOrder = VALUES(sortOrder)`,
      [id, name, displayName, price, currency, JSON.stringify(features), status, sortOrder],
    );
  }

  for (const [id, userId, planName, amount, status] of payments) {
    await connection.execute(
      `INSERT INTO payments (id, userId, planName, amount, currency, status)
       VALUES (?, ?, ?, ?, 'USD', ?)
       ON DUPLICATE KEY UPDATE planName = VALUES(planName), amount = VALUES(amount), status = VALUES(status)`,
      [id, userId, planName, amount, status],
    );
  }

  for (const [id, userId, idType, priority, status, documents] of verificationRequests) {
    await connection.execute(
      `INSERT INTO verification_requests (id, userId, idType, priority, status, documents)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE idType = VALUES(idType), priority = VALUES(priority), status = VALUES(status), documents = VALUES(documents)`,
      [id, userId, idType, priority, status, JSON.stringify(documents)],
    );
  }

  for (const [id, campaign, type, audience, status] of notifications) {
    await connection.execute(
      `INSERT INTO platform_notifications (id, campaign, type, audience, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE campaign = VALUES(campaign), type = VALUES(type), audience = VALUES(audience), status = VALUES(status)`,
      [id, campaign, type, audience, status],
    );
  }

  for (const [id, userId, user, activity, ipAddress, action, module] of auditLogs) {
    await connection.execute(
      `INSERT INTO audit_logs (id, userId, user, activity, ipAddress, action, module)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user = VALUES(user), activity = VALUES(activity), ipAddress = VALUES(ipAddress), action = VALUES(action), module = VALUES(module)`,
      [id, userId, user, activity, ipAddress, action, module],
    );
  }

  for (const [id, role, permissions, status] of roles) {
    await connection.execute(
      `INSERT INTO platform_roles (id, role, permissions, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), status = VALUES(status)`,
      [id, role, permissions, status],
    );
  }

  await connection.execute(
    `INSERT INTO platform_settings (\`key\`, value)
     VALUES ('platform_flags', ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [JSON.stringify({
      maintenanceMode: false,
      userRegistrations: true,
      matchingSystem: true,
      premiumMemberships: true,
    })],
  );

  await connection.end();
  console.log('Database seed ready. User password: Password123, staff password: Admin@123');
}

main().catch((error) => {
  console.error('Failed to seed demo data:', error.message);
  process.exit(1);
});
