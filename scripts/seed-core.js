const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const managementAccounts = [
  ['ADMIN_USER', 'admin'],
  ['DATA_ENTRY_USER', 'data_entry'],
  ['FINANCE_USER', 'finance'],
  ['SALES_USER', 'sales'],
  ['SUPPORT_USER', 'support'],
  ['SUPER_ADMIN', 'super_admin'],
];

const demoAccountPrefixes = [
  'DEMO_USER',
  'DAVID_USER',
  'SARAH_USER',
  'PRIYA_USER',
  'ELENA_USER',
  'MARCUS_USER',
  'AISHA_USER',
  'DIEGO_USER',
];

const roles = [
  ['role-super-admin', 'Super Admin', 42, 'Active'],
  ['role-admin', 'Admin', 32, 'Active'],
  ['role-data-entry', 'Data Entry', 18, 'Active'],
  ['role-finance', 'Finance', 18, 'Active'],
  ['role-sales', 'Sales', 16, 'Active'],
  ['role-support', 'Support', 20, 'Active'],
];

const plans = [
  ['plan-free', 'free', 'Basic Plan', 0, 'INR', ['20 Likes per day', 'Basic Matching', 'Chat after Match', 'View Basic Profile'], 'active', 1],
  ['plan-gold', 'gold', 'Premium Plan', 199, 'INR', ['Unlimited Likes', 'See Who Liked You', '5 Super Likes per day', 'Profile Boost (1 per week)', 'No Ads', 'Priority Matching'], 'active', 2],
  ['plan-platinum', 'platinum', 'Elite Plan', 399, 'INR', ['Unlimited Likes', 'See Who Liked You', 'Unlimited Super Likes', 'Unlimited Profile Boost', 'Priority Matching', 'Advanced Filters', 'Top Search Ranking', 'Premium Badge', 'No Ads'], 'active', 3],
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

  const demoUserIds = demoAccountPrefixes.map((prefix) => env(`${prefix}_ID`)).filter(Boolean);
  for (const id of demoUserIds) {
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
  }
  const legacyMarketingId = env('MARKETING_USER_ID') || 'marketing-1';
  const legacyMarketingEmail = env('MARKETING_USER_EMAIL') || 'marketing@connectlove.com';
  await connection.execute('DELETE FROM users WHERE id = ? OR email = ?', [legacyMarketingId, legacyMarketingEmail]);
  await connection.execute("DELETE FROM platform_roles WHERE id = 'role-marketing' OR role = 'Marketing'");
  await connection.execute("DELETE FROM payments WHERE id IN ('pay-1','pay-2','pay-3','pay-4')");
  await connection.execute("DELETE FROM verification_requests WHERE id IN ('ver-1','ver-2')");
  await connection.execute("DELETE FROM platform_notifications WHERE id IN ('notif-1','notif-2','notif-3')");
  await connection.execute("DELETE FROM audit_logs WHERE id IN ('log-1','log-2','log-3','log-4')");
  await connection.execute("DELETE FROM contacts WHERE email IN ('elena@example.com','marcus@example.com') AND subject IN ('Verification stuck','Refund request')");
  await connection.execute(`
    DELETE m FROM matches m
    LEFT JOIN users s ON s.id = m.senderId
    LEFT JOIN users r ON r.id = m.receiverId
    WHERE COALESCE(s.role, 'user') <> 'user' OR COALESCE(r.role, 'user') <> 'user'
  `);

  for (const [prefix, role] of managementAccounts) {
    const id = env(`${prefix}_ID`);
    const name = env(`${prefix}_NAME`);
    const email = env(`${prefix}_EMAIL`);
    const password = env(`${prefix}_PASSWORD`);
    if (!id || !name || !email || !password) continue;

    const hash = await bcrypt.hash(password, 12);
    await connection.execute(
      `INSERT INTO users (
        id, name, email, password, role, plan, status, isVerified, onboardingCompleted
      ) VALUES (?, ?, ?, ?, ?, 'platinum', 'active', 1, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        password = VALUES(password),
        role = VALUES(role),
        plan = VALUES(plan),
        status = VALUES(status),
        isVerified = VALUES(isVerified),
        onboardingCompleted = VALUES(onboardingCompleted)`,
      [id, name, email, hash, role],
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
  console.log('Core database data ready. No demo users, matches, messages, payments, or tickets were seeded.');
}

main().catch((error) => {
  console.error('Failed to seed core data:', error.message);
  process.exit(1);
});
