const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local development database only.');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const mysql = require('mysql2/promise');
const { JwtService } = require('@nestjs/jwt');
const prefix = `uitest-${randomUUID()}`;
const agentId = randomUUID(), ownId = randomUUID(), deleteId = randomUUID(), friendId = randomUUID(), adminId = randomUUID(), matchId = randomUUID();
let db, browser, page;
async function run() {
  db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await db.execute('INSERT INTO agents (id,name,email,password) VALUES (?,?,?,?)', [agentId, `${prefix} agent`, `${agentId}@example.invalid`, 'not-a-login']);
  for (const [id, suffix, role, agent] of [[ownId, 'Own', 'user', agentId], [deleteId, 'Delete', 'user', agentId], [friendId, 'Friend', 'user', null], [adminId, 'Admin', 'super_admin', null]]) {
    await db.execute('INSERT INTO users (id,name,email,password,birthDate,gender,city,role,status,createdByAgentId) VALUES (?,?,?,?,?,?,?,?,?,?)', [id, `${prefix} ${suffix}`, `${id}@example.invalid`, 'not-a-login', '1995-01-01', 'female', 'Mumbai', role, 'active', agent]);
  }
  await db.execute('INSERT INTO matches (id,senderId,receiverId,status) VALUES (?,?,?,?)', [matchId, ownId, friendId, 'MATCHED']);
  for (const [type, seconds] of [['audio', 90], ['video', 120]]) {
    await db.execute('INSERT INTO video_calls (id,conversationId,callerId,receiverId,callType,status,startedAt,endedAt) VALUES (?,?,?,?,?,?,?,?)', [randomUUID(), matchId, ownId, friendId, type, 'ended', new Date('2026-11-01T10:00:00Z'), new Date(new Date('2026-11-01T10:00:00Z').getTime() + seconds * 1000)]);
  }
  const jwt = new JwtService();
  const agentToken = jwt.sign({ sub: agentId, version: 0 }, { secret: `${process.env.JWT_SECRET.trim()}:connectlove-agent`, audience: 'agent', expiresIn: '15m' });
  const adminToken = jwt.sign({ sub: adminId, role: 'super_admin' }, { secret: process.env.JWT_SECRET.trim(), expiresIn: '15m' });
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies(['management_token', 'management_client_token', 'management_role'].map(name => ({ name, value: name === 'management_role' ? 'super_admin' : adminToken, domain: 'localhost', path: '/' })));
  await context.addInitScript(token => sessionStorage.setItem('connectlove_agent_token', token), agentToken);
  page = await context.newPage(); page.setDefaultTimeout(60000);
  const ready = await fetch(`http://localhost:5002/api/users?search=${encodeURIComponent(prefix)}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(ready.status, 200, 'Local API must be ready before browser checks');
  assert.ok((await ready.json()).users.some(user => user.id === ownId));
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3002/super-admin/user-360', { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByPlaceholder('Search ID, name or email...').fill(`${prefix} Own`);
  await page.getByText(`${prefix} Own`, { exact: true }).first().waitFor();
  await page.getByRole('heading', { name: `${prefix} Own`, exact: true }).waitFor();
  await page.getByText('Agent ID: ' + agentId, { exact: true }).waitFor();
  const image = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 90; canvas.height = 120; const c = canvas.getContext('2d'); c.fillStyle = '#c63865'; c.fillRect(0, 0, 90, 120); return canvas.toDataURL('image/png').split(',')[1]; });
  await page.locator('input[type=file][multiple]').setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await page.getByRole('button', { name: 'Remove photo 1', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  async function photoCount() { const [rows] = await db.execute('SELECT JSON_LENGTH(photos) AS total FROM users WHERE id=?', [ownId]); return Number(rows[0].total); }
  for (let i = 0; i < 50 && await photoCount() !== 1; i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await photoCount(), 1);
  await page.getByRole('button', { name: 'Save Changes', exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Remove photo 1', exact: true }).click();
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  for (let i = 0; i < 50 && await photoCount() !== 0; i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await photoCount(), 0);
  console.log('PASS: Super Admin User 360 agent origin and real photo upload/remove/save');
  await page.goto('http://localhost:3002/super-admin/users', { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByLabel('Registration source', { exact: true }).selectOption('agent');
  await page.getByPlaceholder('Search by name or email').fill(prefix);
  await page.getByText(`${prefix} Own`, { exact: true }).waitFor();
  assert.equal(await page.getByText(`${prefix} Friend`, { exact: true }).count(), 0);
  console.log('PASS: Super Admin agent-created users filter');
  await page.goto('http://localhost:3002/agent/dashboard', { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByRole('button', { name: `${prefix} Own`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'User details', exact: true });
  await dialog.getByRole('heading', { name: 'Friends & call activity', exact: true }).waitFor();
  await dialog.getByText('1m 30s', { exact: true }).waitFor();
  await dialog.getByText('2m 0s', { exact: true }).waitFor();
  await dialog.locator('summary').click();
  await dialog.getByText(`${prefix} Friend`, { exact: true }).first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await dialog.getByRole('button', { name: 'Ban user', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm ban', exact: true }).click();
  await dialog.getByRole('button', { name: 'User banned', exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Close details' }).click();
  await page.getByRole('button', { name: `${prefix} Delete`, exact: true }).click();
  await page.getByRole('button', { name: 'Delete user', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await page.getByText('User permanently deleted.', { exact: true }).waitFor();
  const [deleted] = await db.execute('SELECT id FROM users WHERE id=?', [deleteId]); assert.equal(deleted.length, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: agent friend/call details, exact talk time, mobile layout, confirmed ban/delete; no browser errors');
}
run().catch(async error => {
  console.error(error.message);
  if (page) {
    console.error('UI page:', page.url());
    const query = page.getByPlaceholder('Search ID, name or email...');
    if (await query.count()) console.error('Search query:', await query.inputValue());
    await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'agent-management-ui-debug.png'), fullPage: true }).catch(() => {});
  }
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (db) {
    await db.execute('DELETE FROM audit_logs WHERE userId IN (?,?,?,?) OR activity LIKE ?', [ownId, deleteId, friendId, adminId, `%${prefix}%`]);
    await db.execute('DELETE FROM users WHERE id IN (?,?,?,?)', [ownId, deleteId, friendId, adminId]);
    await db.execute('DELETE FROM agents WHERE id=?', [agentId]); await db.end();
  }
});
