const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local development database only.');
const mysql = require('mysql2/promise');
const { JwtService } = require('@nestjs/jwt');
const bcrypt = require('bcryptjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ids = { owner: randomUUID(), empty: randomUUID(), admin: randomUUID(), one: randomUUID(), two: randomUUID() };
const prefix = `agentui-${randomUUID()}`;
let db, browser, page;
async function run() {
  db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const password = 'Strong-Password-123', hash = await bcrypt.hash(password, 12);
  for (const [id, suffix] of [[ids.owner, 'Owner'], [ids.empty, 'Empty']]) await db.execute('INSERT INTO agents (id,name,email,password) VALUES (?,?,?,?)', [id, `${prefix} ${suffix}`, `${id}@example.invalid`, hash]);
  for (const [id, suffix, role, status, creator] of [[ids.admin, 'Admin', 'super_admin', 'active', null], [ids.one, 'User One', 'user', 'active', ids.owner], [ids.two, 'User Two', 'user', 'banned', ids.owner]]) await db.execute('INSERT INTO users (id,name,email,password,role,status,createdByAgentId,birthDate,city,gender) VALUES (?,?,?,?,?,?,?,?,?,?)', [id, `${prefix} ${suffix}`, `${id}@example.invalid`, hash, role, status, creator, '1995-01-01', 'Mumbai', 'female']);
  const jwt = new JwtService();
  const adminToken = jwt.sign({ sub: ids.admin }, { secret: process.env.JWT_SECRET.trim(), expiresIn: '15m' });
  const agentToken = jwt.sign({ sub: ids.owner, version: 0 }, { secret: `${process.env.JWT_SECRET.trim()}:connectlove-agent`, audience: 'agent', expiresIn: '15m' });
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies(['management_token', 'management_client_token', 'management_role'].map(name => ({ name, value: name === 'management_role' ? 'super_admin' : adminToken, domain: 'localhost', path: '/' })));
  page = await context.newPage(); page.setDefaultTimeout(45000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  async function openAgents() { await page.goto('http://localhost:3002/super-admin/agents', { waitUntil: 'networkidle', timeout: 120000 }); await page.getByRole('textbox', { name: 'Search accounts' }).fill(prefix); await page.getByRole('button', { name: `View agent ${prefix} Owner`, exact: true }).waitFor(); }
  await openAgents();
  await page.getByRole('button', { name: `View agent ${prefix} Owner`, exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Agent details', exact: true });
  await dialog.getByRole('link', { name: `${prefix} User One`, exact: true }).waitFor();
  assert.equal(await dialog.getByText('Created users', { exact: true }).locator('..').locator('strong').innerText(), '2');
  assert.equal(await dialog.getByText('Active users', { exact: true }).locator('..').locator('strong').innerText(), '1');
  assert.equal(await dialog.getByText('Banned users', { exact: true }).locator('..').locator('strong').innerText(), '1');
  await page.screenshot({ path: path.join(os.tmpdir(), 'connectlove-super-admin-agent-details.png') });
  await dialog.getByRole('link', { name: `${prefix} User One`, exact: true }).click();
  await page.waitForURL(`**/super-admin/user-360?user=${ids.one}`);
  await page.getByRole('heading', { name: `${prefix} User One`, exact: true }).waitFor();
  console.log('PASS: agent View, precise counts/list and deep link to created user 360');
  await openAgents();
  await page.getByRole('button', { name: `Ban agent ${prefix} Owner`, exact: true }).click();
  await page.getByRole('button', { name: 'Confirm ban agent', exact: true }).click();
  await page.getByRole('button', { name: `Unban agent ${prefix} Owner`, exact: true }).waitFor();
  assert.equal((await fetch('http://localhost:5002/agents/me', { headers: { Authorization: `Bearer ${agentToken}` } })).status, 401);
  const loginBody = { email: `${ids.owner}@example.invalid`, password };
  assert.equal((await fetch('http://localhost:5002/agents/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginBody) })).status, 401);
  await page.getByRole('button', { name: `Unban agent ${prefix} Owner`, exact: true }).click();
  await page.getByRole('button', { name: 'Confirm unban agent', exact: true }).click();
  await page.getByRole('button', { name: `Ban agent ${prefix} Owner`, exact: true }).waitFor();
  assert.equal((await fetch('http://localhost:5002/agents/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginBody) })).status, 200);
  console.log('PASS: confirmed Ban/Unban, expired session rejection and fresh login');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: `Delete agent ${prefix} Empty`, exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const [stillActive] = await db.execute('SELECT status FROM agents WHERE id=?', [ids.empty]); assert.equal(stillActive[0].status, 'active');
  await page.getByRole('button', { name: `Delete agent ${prefix} Owner`, exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete agent', exact: true }).click();
  await page.getByText('Agent account deleted.', { exact: false }).waitFor();
  await page.getByRole('button', { name: `View agent ${prefix} Empty`, exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: `View agent ${prefix} Owner`, exact: true }).count(), 0);
  const [preserved] = await db.execute('SELECT id FROM users WHERE createdByAgentId=?', [ids.owner]); assert.equal(preserved.length, 2);
  await page.getByRole('button', { name: `View agent ${prefix} Empty`, exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Agent details', exact: true });
  await dialog.getByText('This agent has not added any users yet.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS: delete confirmation/cancel, agent removed from directory, created users preserved, empty-agent view and mobile layout; no browser errors');
}
run().catch(async error => {
  console.error(error.message); process.exitCode = 1;
  if (page) { console.error('Page:', page.url()); await page.screenshot({ path: path.join(os.tmpdir(), 'agent-admin-management-debug.png') }).catch(() => {}); }
}).finally(async () => {
  if (browser) await browser.close();
  if (db) {
    await db.execute('DELETE FROM audit_logs WHERE userId IN (?,?,?)', [ids.admin, ids.one, ids.two]);
    await db.execute('DELETE FROM users WHERE id IN (?,?,?)', [ids.admin, ids.one, ids.two]);
    await db.execute('DELETE FROM agents WHERE id IN (?,?)', [ids.owner, ids.empty]); await db.end();
  }
});
