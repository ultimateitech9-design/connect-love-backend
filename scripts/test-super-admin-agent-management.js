const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local development database only.');
process.env.TYPEORM_MIGRATIONS_RUN = 'false';
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource, In, Not } = require('typeorm');
const { JwtService } = require('@nestjs/jwt');
const bcrypt = require('bcryptjs');
const { AppModule } = require('../dist/app.module');
const { Agent, AgentEmailChallenge } = require('../dist/agents/agent.entity');
const { AgentsService } = require('../dist/agents/agents.service');
const { User } = require('../dist/users/user.entity');
const { AuditLog } = require('../dist/platform/audit-log.entity');
const prefix = `admin-agent-${randomUUID()}`;
const users = [], agents = [], emails = [];
let app, db;
async function run() {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1'); db = app.get(DataSource); const origin = await app.getUrl();
  const agentRepo = db.getRepository(Agent), userRepo = db.getRepository(User);
  const password = 'Strong-Password-123';
  const hash = await bcrypt.hash(password, 12);
  for (const name of ['Owner', 'Empty']) {
    const email = `${randomUUID()}@example.invalid`; emails.push(email);
    agents.push(await agentRepo.save({ name: `${prefix} ${name}`, email, password: hash }));
  }
  const owner = agents[0], empty = agents[1];
  async function makeUser(suffix, role, status = 'active', creator = null) {
    const user = await userRepo.save({ name: `${prefix} ${suffix}`, email: `${randomUUID()}@example.invalid`, password: hash, role, status, createdByAgentId: creator, birthDate: '1996-04-10', city: 'Indore', gender: 'female' }); users.push(user); return user;
  }
  const admin = await makeUser('Admin', 'super_admin'), support = await makeUser('Support', 'support'), regular = await makeUser('Direct', 'user');
  const owned = [];
  for (let i = 0; i < 13; i++) owned.push(await makeUser(`Created ${i}`, 'user', i < 10 ? 'active' : i < 12 ? 'banned' : 'suspended', owner.id));
  const jwt = new JwtService();
  const token = id => jwt.sign({ sub: id }, { secret: process.env.JWT_SECRET.trim(), expiresIn: '15m' });
  const at = token(admin.id);
  async function req(path, auth = at, body, method, status = 200) {
    const response = await fetch(origin + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json(); assert.equal(response.status, status, `${path}: ${result.message || response.status}`); return result;
  }
  const login = await req('/agents/auth/login', null, { email: owner.email, password });
  await req('/agents/me', login.token);
  const details = await req(`/api/agents/${owner.id}?limit=5`);
  assert.equal(details.agent.userCount, 13); assert.equal(details.agent.activeUserCount, 10); assert.equal(details.agent.bannedUserCount, 2);
  assert.equal(details.users.length, 5); assert.equal(details.pages, 3);
  assert.ok(!('password' in details.agent) && !('sessionVersion' in details.agent));
  assert.ok(details.users.every(user => !('password' in user) && !('kycLivePhoto' in user)));
  assert.equal((await req(`/api/agents/${owner.id}?limit=5&page=3`)).users.length, 3);
  assert.equal((await req(`/api/agents/${empty.id}`)).agent.userCount, 0);
  for (const id of [support.id, regular.id]) {
    await req(`/api/agents/${owner.id}`, token(id), undefined, 'GET', 403);
    await req(`/api/agents/${owner.id}/status`, token(id), { status: 'banned' }, 'PATCH', 403);
    await req(`/api/agents/${owner.id}`, token(id), undefined, 'DELETE', 403);
  }
  await req(`/api/agents/${owner.id}`, login.token, undefined, 'DELETE', 401);
  await req(`/api/agents/${randomUUID()}`, at, undefined, 'GET', 404);
  await req(`/api/agents/${owner.id}/status`, at, { status: 'deleted' }, 'PATCH', 400);
  await req(`/api/agents/${owner.id}/status`, at, { status: 'banned', name: 'Override' }, 'PATCH', 400);
  await req(`/api/agents/${owner.id}/status`, at, { status: 'banned' }, 'PATCH');
  await req('/agents/me', login.token, undefined, 'GET', 401);
  await req('/agents/auth/login', null, { email: owner.email, password }, 'POST', 401);
  const proposed = { name: 'Must not create', email: `${randomUUID()}@example.invalid`, password, birthDate: '1996-04-10', city: 'Indore', gender: 'female' };
  await req('/agents/users/bulk', login.token, { users: [proposed], consentConfirmed: true }, 'POST', 401);
  await assert.rejects(() => app.get(AgentsService).createUsers(owner.id, { users: [proposed], consentConfirmed: true }), err => err.getStatus() === 401);
  assert.equal(await userRepo.countBy({ email: proposed.email }), 0);
  assert.equal(await userRepo.countBy({ createdByAgentId: owner.id }), 13);
  const all = await req(`/api/accounts?status=all&search=${encodeURIComponent(prefix)}`);
  assert.equal(all.accounts.find(row => row.id === owner.id).status, 'banned');
  const active = await req(`/api/accounts?status=active&search=${encodeURIComponent(prefix)}`);
  assert.ok(!active.accounts.some(row => row.id === owner.id));
  const stats = (await req('/api/dashboard')).stats;
  assert.equal(Number(stats.find(stat => stat.label === 'Active Users').value), await userRepo.countBy({ status: 'active' }) + await agentRepo.countBy({ status: 'active' }));
  const otp = '123456', newPassword = 'Changed-Password-456';
  await db.getRepository(AgentEmailChallenge).save({ email: owner.email, purpose: 'reset', codeHash: createHmac('sha256', `${process.env.JWT_SECRET.trim()}:connectlove-agent`).update(`reset:${owner.email}:${otp}`).digest('hex'), expiresAt: new Date(Date.now() + 600000), sentAt: new Date(), windowStartedAt: new Date() });
  await req('/agents/auth/reset-password', null, { email: owner.email, password: newPassword, otp }, 'POST', 201);
  await req('/agents/auth/login', null, { email: owner.email, password: newPassword }, 'POST', 401);
  await req(`/api/agents/${owner.id}/status`, at, { status: 'active' }, 'PATCH');
  await req('/agents/me', login.token, undefined, 'GET', 401);
  const nextLogin = await req('/agents/auth/login', null, { email: owner.email, password: newPassword });
  await req('/agents/me', nextLogin.token);
  await req(`/api/agents/${owner.id}`, at, undefined, 'DELETE');
  await req('/agents/me', nextLogin.token, undefined, 'GET', 401);
  await req('/agents/auth/login', null, { email: owner.email, password: newPassword }, 'POST', 401);
  const deleted = await agentRepo.findOneByOrFail({ id: owner.id }); assert.equal(deleted.status, 'deleted'); assert.ok(deleted.deletedAt);
  assert.equal(await userRepo.countBy({ createdByAgentId: owner.id }), 13);
  const listing = await req(`/api/agents?search=${encodeURIComponent(prefix)}`); assert.equal(listing.total, 1); assert.equal(listing.agents[0].id, empty.id);
  assert.ok(!(await req(`/api/accounts?status=all&search=${encodeURIComponent(prefix)}`)).accounts.some(row => row.id === owner.id));
  await req(`/api/agents/${owner.id}`, at, undefined, 'GET', 404);
  await req(`/api/agents/${owner.id}/status`, at, { status: 'active' }, 'PATCH', 404);
  const createdUser = await req(`/api/users/${owned[0].id}`); assert.equal(createdUser.user.createdByAgent.id, owner.id); assert.equal(createdUser.user.createdByAgent.name, owner.name);
  await req('/users/me', token(owned[0].id));
  const finalStats = (await req('/api/dashboard')).stats;
  assert.equal(Number(finalStats.find(stat => stat.label === 'Registered Agents').value), await agentRepo.countBy({ status: Not('deleted') }));
  assert.equal(await db.getRepository(AuditLog).countBy({ userId: admin.id, module: 'Agent Management' }), 3);
  console.log('PASS: Super Admin-only agent View/Ban/Unban/Delete, exact created-user counts and pagination, token/login revocation, reset cannot bypass ban, race-safe creation check, preserved users/attribution, accurate directories/dashboard and audit log.');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (db) {
    if (emails.length) await db.getRepository(AgentEmailChallenge).delete({ email: In(emails) });
    if (users.length) { await db.getRepository(AuditLog).delete({ userId: In(users.map(user => user.id)) }); await db.getRepository(User).delete({ id: In(users.map(user => user.id)) }); }
    if (agents.length) await db.getRepository(Agent).delete({ id: In(agents.map(agent => agent.id)) });
  }
  if (app) await app.close();
});
