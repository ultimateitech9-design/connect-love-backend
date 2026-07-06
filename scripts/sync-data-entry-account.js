const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME || 'dating_web_app',
  });

  const legacyMarketingId = process.env.MARKETING_USER_ID || 'marketing-1';
  const legacyMarketingEmail = process.env.MARKETING_USER_EMAIL || 'marketing@connectlove.com';
  await connection.execute('DELETE FROM users WHERE id = ? OR email = ?', [legacyMarketingId, legacyMarketingEmail]);
  await connection.execute("DELETE FROM platform_roles WHERE id = 'role-marketing' OR role = 'Marketing'");

  const requiredKeys = [
    'DATA_ENTRY_USER_ID',
    'DATA_ENTRY_USER_NAME',
    'DATA_ENTRY_USER_EMAIL',
    'DATA_ENTRY_USER_PASSWORD',
  ];
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing env keys: ${missing.join(', ')}`);
  }

  const hash = await bcrypt.hash(process.env.DATA_ENTRY_USER_PASSWORD, 12);
  await connection.execute(
    `INSERT INTO users (
      id, name, email, password, role, plan, status, isVerified, onboardingCompleted
    ) VALUES (?, ?, ?, ?, 'data_entry', 'platinum', 'active', 1, 1)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      password = VALUES(password),
      role = VALUES(role),
      plan = VALUES(plan),
      status = VALUES(status),
      isVerified = VALUES(isVerified),
      onboardingCompleted = VALUES(onboardingCompleted)`,
    [
      process.env.DATA_ENTRY_USER_ID,
      process.env.DATA_ENTRY_USER_NAME,
      process.env.DATA_ENTRY_USER_EMAIL,
      hash,
    ],
  );

  await connection.execute(
    `INSERT INTO platform_roles (id, role, permissions, status)
     VALUES ('role-data-entry', 'Data Entry', 18, 'Active')
     ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), status = VALUES(status)`,
  );

  await connection.end();
  console.log('Data Entry account synced and legacy Marketing account removed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
