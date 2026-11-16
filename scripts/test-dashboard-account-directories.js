const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local development database only.');
process.env.TYPEORM_MIGRATIONS_RUN = 'false';
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource, In, Not } = require('typeorm');
const { JwtService } = require('@nestjs/jwt');
const { AppModule } = require('../dist/app.module');
const { Agent } = require('../dist/agents/agent.entity');
const { User } = require('../dist/users/user.entity');
const prefix = `directorytest-${randomUUID()}`;
const userIds = [], agentIds = [];
let app, db;
async function run() {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1'); db = app.get(DataSource); const origin = await app.getUrl();
  const agentRepo = db.getRepository(Agent), userRepo = db.getRepository(User);
  for (const suffix of ['Agent One', 'Agent Two']) { const row = await agentRepo.save({ name: `${prefix} ${suffix}`, email: `${randomUUID()}@example.invalid`, password: 'not-a-login' }); agentIds.push(row.id); }
  for (const [suffix, role, status, agent] of [['Created User', 'user', 'active', agentIds[0]], ['Direct User', 'user', 'active', null], ['Banned User', 'user', 'banned', agentIds[0]], ['Admin', 'super_admin', 'active', null], ['Support', 'support', 'active', null]]) {
    const row = await userRepo.save({ name: `${prefix} ${suffix}`, email: `${randomUUID()}@example.invalid`, password: 'not-a-login', role, status, createdByAgentId: agent }); userIds.push(row.id);
  }
  const jwt = new JwtService();
  const token = id => jwt.sign({ sub: id }, { secret: process.env.JWT_SECRET.trim(), expiresIn: '10m' });
  const adminToken = token(userIds[3]);
  async function get(path, auth = adminToken, expected = 200) {
    const response = await fetch(origin + path, { headers: { Authorization: `Bearer ${auth}` } });
    assert.equal(response.status, expected, path); return response.json();
  }
  const agents = await get(`/api/agents?search=${encodeURIComponent(prefix)}`);
  assert.equal(agents.total, 2); assert.ok(agents.agents.every(row => agentIds.includes(row.id)));
  assert.ok(agents.agents.every(row => !('password' in row) && !('sessionVersion' in row)));
  const first = agents.agents.find(row => row.id === agentIds[0]); assert.equal(first.userCount, 2); assert.equal(first.activeUserCount, 1);
  const active = await get(`/api/accounts?status=active&search=${encodeURIComponent(prefix)}`);
  assert.equal(active.total, 6); assert.equal(active.accounts.filter(row => row.accountType === 'agent').length, 2);
  assert.equal(active.accounts.filter(row => row.accountType === 'user').length, 4); assert.ok(active.accounts.every(row => row.status === 'active' && !('password' in row)));
  const all = await get(`/api/accounts?status=all&search=${encodeURIComponent(prefix)}`); assert.equal(all.total, 7);
  const found = [];
  for (let page = 1; page <= 4; page++) { const data = await get(`/api/accounts?status=all&search=${encodeURIComponent(prefix)}&limit=2&page=${page}`); found.push(...data.accounts.map(row => `${row.accountType}:${row.id}`)); }
  assert.equal(new Set(found).size, 7);
  const dashboard = await get('/api/dashboard');
  const stats = Object.fromEntries(dashboard.stats.map(row => [row.label, Number(row.value)]));
  assert.equal(stats['Registered Agents'], await agentRepo.countBy({ status: Not('deleted') }));
  assert.equal(stats['Active Users'], await userRepo.countBy({ status: 'active' }) + await agentRepo.countBy({ status: 'active' }));
  assert.equal(stats['Total Users'], await userRepo.count() + await agentRepo.countBy({ status: Not('deleted') }));
  for (const id of [userIds[0], userIds[4]]) { await get('/api/agents', token(id), 403); await get('/api/accounts', token(id), 403); }
  console.log('PASS: agent-only directory, created-user counts, combined active/all account counts, search/pagination, dashboard consistency, secret-field exclusion and Super Admin authorization.');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (db) { if (userIds.length) await db.getRepository(User).delete({ id: In(userIds) }); if (agentIds.length) await db.getRepository(Agent).delete({ id: In(agentIds) }); }
  if (app) await app.close();
});
