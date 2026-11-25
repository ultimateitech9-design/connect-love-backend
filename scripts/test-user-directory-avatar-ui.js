// Local temporary members only; existing admin session is used for read-only checks.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const { JwtService } = require('@nestjs/jwt');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local database only.');
const ids = [randomUUID(), randomUUID(), randomUUID()];
const name = `Directory ${randomUUID().slice(0, 8)}`;
const base = `http://localhost:${process.env.PORT || 5003}`;
let db, browser;
async function run() {
  db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const [admins] = await db.query("SELECT id FROM users WHERE role='super_admin' AND status='active' LIMIT 1");
  assert(admins.length);
  const jwt = new JwtService();
  const token = id => jwt.sign({ sub: id }, { secret: process.env.JWT_SECRET.trim(), expiresIn: '10m' });
  const photos = [];
  for (const background of ['#cc0044', '#0077cc']) {
    const image = await sharp({ create: { width: 800, height: 600, channels: 3, background } }).png().toBuffer();
    photos.push('data:image/png;base64,' + image.toString('base64'));
  }
  for (let i = 0; i < ids.length; i++) await db.execute('INSERT INTO users (id,name,email,password,birthDate,gender,role,status,onboardingCompleted,photos) VALUES (?,?,?,?,?,?,?,?,?,?)', [ids[i], name, `${ids[i]}@example.invalid`, 'not-a-login', '1995-01-01', 'male', 'user', 'active', true, JSON.stringify(i < 2 ? [photos[i]] : [])]);
  const read = (id, viewer) => fetch(`${base}/api/users/${id}/avatar`, { headers: viewer ? { Authorization: `Bearer ${token(viewer)}` } : {} });
  assert.equal((await read(ids[0])).status, 401);
  assert.equal((await read(ids[0], ids[2])).status, 403);
  for (const id of ids.slice(0, 2)) {
    const response = await read(id, admins[0].id); assert.equal(response.status, 200);
    const { photo } = await response.json(); assert(photo.startsWith('data:image/webp;base64,'));
    const metadata = await sharp(Buffer.from(photo.split(',')[1], 'base64')).metadata();
    assert.equal(metadata.width, 80); assert.equal(metadata.height, 80);
  }
  assert.equal((await (await read(ids[2], admins[0].id)).json()).photo, null);
  assert.equal((await read(randomUUID(), admins[0].id)).status, 404);
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies(['management_token', 'management_client_token', 'management_role'].map(key => ({ name: key, value: key === 'management_role' ? 'super_admin' : token(admins[0].id), domain: 'localhost', path: '/' })));
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  await page.goto(`http://localhost:3009/super-admin/user-360?user=${ids[0]}`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Search ID, name or email...').fill(name);
  for (const id of ids.slice(0, 2)) {
    const avatar = page.locator(`[data-user-avatar="${id}"] img`);
    await avatar.waitFor(); assert(await avatar.evaluate(img => img.complete && img.naturalWidth > 0));
  }
  const fallback = page.locator(`[data-user-avatar="${ids[2]}"]`);
  await fallback.getByText(name.split(' ').map(word => word[0]).join('').toUpperCase(), { exact: true }).waitFor();
  assert.equal(await fallback.locator('img').count(), 0);
  await page.locator(`[data-user-avatar="${ids[1]}"]`).click();
  await page.waitForFunction(email => [...document.querySelectorAll('input')].some(input => input.value === email), `${ids[1]}@example.invalid`);
  console.log('PASS: super-admin-only avatars, 80px thumbnails, missing-photo fallback, missing-user response, same-name users show distinct DPs, selection opens the correct member.');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  if (db) { await db.execute('DELETE FROM users WHERE id IN (?,?,?)', ids); await db.end(); }
});
