// Uses local running frontend/API and temporary records. No real email is sent.
// Set PLAYWRIGHT_MODULE to an installed Playwright module, then run this script.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Use only a local development database.');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const mysql = require('mysql2/promise');
const { JwtService } = require('@nestjs/jwt');
const agentId = randomUUID();
const viewerId = randomUUID();
const name = `Photo test ${randomUUID()}`;
const api = 'http://localhost:5002';
let browser, db;
async function run() {
  db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await db.execute('INSERT INTO agents (id,name,email,password) VALUES (?,?,?,?)', [agentId, 'Photo Test Agent', `${agentId}@example.invalid`, 'test-only-not-a-login']);
  const jwt = new JwtService();
  const token = jwt.sign({ sub: agentId, version: 0 }, { secret: `${process.env.JWT_SECRET.trim()}:connectlove-agent`, audience: 'agent', expiresIn: '10m' });
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => sessionStorage.setItem('connectlove_agent_token', value), token);
  await page.goto('http://localhost:3002/agent/dashboard', { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByRole('button', { name: 'Create accounts', exact: true }).first().click();
  await page.getByPlaceholder('Full name', { exact: true }).fill(name);
  await page.getByPlaceholder('user@gmail.com').fill(`${agentId}-user@example.invalid`);
  await page.getByPlaceholder('At least 8 characters').fill('Photo-Test-Password-123');
  await page.getByLabel('Date of birth *', { exact: true }).fill('1998-04-15');
  await page.getByPlaceholder('e.g. Mumbai').fill('Mumbai');
  await page.getByRole('checkbox').check();
  const fileInput = page.locator('.ag-draft input[type=file]');
  await fileInput.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await page.getByText('This photo could not be opened.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Create 1 account', exact: true }).isDisabled(), true);
  const largeImage = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1200;
    const ctx = canvas.getContext('2d'); const data = ctx.createImageData(canvas.width, canvas.height);
    let seed = 123456;
    for (let i = 0; i < data.data.length; i += 4) {
      for (let j = 0; j < 3; j++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; data.data[i + j] = seed >>> 24; }
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0); return canvas.toDataURL('image/png').split(',')[1];
  });
  const buffer = Buffer.from(largeImage, 'base64'); assert.ok(buffer.length > 1024 * 1024);
  await fileInput.setInputFiles({ name: 'large-phone-photo.png', mimeType: 'image/png', buffer });
  const preview = page.getByRole('img', { name: `Profile photo for ${name}`, exact: true });
  await preview.waitFor();
  assert.equal(await preview.evaluate(img => img.complete && img.naturalWidth > 0 && img.naturalWidth <= 1280), true);
  const savedImage = await preview.getAttribute('src'); assert.ok(savedImage.length <= 1400000);
  const createButton = page.getByRole('button', { name: 'Create 1 account', exact: true });
  await createButton.click(); await page.getByText('Login details are ready', { exact: true }).waitFor();
  const [users] = await db.execute('SELECT id,photos,photosVisibleToNonMatches FROM users WHERE createdByAgentId=?', [agentId]);
  assert.equal(users.length, 1);
  const photos = typeof users[0].photos === 'string' ? JSON.parse(users[0].photos) : users[0].photos;
  assert.deepEqual(photos, [savedImage]); assert.equal(users[0].photosVisibleToNonMatches, 1);
  await db.execute('INSERT INTO users (id,name,email,password,birthDate,gender,city,role,status) VALUES (?,?,?,?,?,?,?,?,?)', [viewerId, 'Photo Test Viewer', `${viewerId}@example.invalid`, 'not-a-login', '1995-01-01', 'male', 'Mumbai', 'user', 'active']);
  const viewerToken = jwt.sign({ sub: viewerId, role: 'user' }, { secret: process.env.JWT_SECRET.trim(), expiresIn: '10m' });
  async function discovery() {
    const response = await fetch(`${api}/discovery?search=${encodeURIComponent(name)}&interestedIn=everyone`, { headers: { Authorization: `Bearer ${viewerToken}` } });
    assert.equal(response.status, 200); const profiles = await response.json(); return profiles.find(profile => profile.id === users[0].id);
  }
  assert.equal((await discovery()).photo, savedImage);
  await page.getByRole('button', { name: 'View details' }).click();
  await page.getByRole('dialog').waitFor();
  const replacement = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#c63865'; ctx.fillRect(0, 0, 100, 100); return canvas.toDataURL('image/png').split(',')[1]; });
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from(replacement, 'base64') });
  await page.getByText('Profile photo saved successfully.', { exact: true }).waitFor();
  const newPhoto = await page.getByRole('dialog').locator('.ag-detail-photos img').first().getAttribute('src');
  assert.notEqual(newPhoto, savedImage); assert.equal((await discovery()).photo, newPhoto);
  assert.equal(await page.getByRole('dialog').locator('.ag-detail-photos img').first().evaluate(img => img.complete && img.naturalWidth > 0), true);
  assert.deepEqual(errors, []);
  console.log('PASS: corrupt-image feedback, >1 MB phone photo resizing, visible preview, real account creation and DB persistence, Discover photo, existing-user photo replacement and Discover refresh.');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (db) { await db.execute('DELETE FROM users WHERE createdByAgentId=? OR id=?', [agentId, viewerId]); await db.execute('DELETE FROM agents WHERE id=?', [agentId]); await db.end(); }
});
