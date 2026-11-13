const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local development database only.');
process.env.TYPEORM_MIGRATIONS_RUN = 'false';
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource, In } = require('typeorm');
const { JwtService } = require('@nestjs/jwt');
const { AppModule } = require('../dist/app.module');
const { Agent } = require('../dist/agents/agent.entity');
const { User } = require('../dist/users/user.entity');
const { MatchRelation } = require('../dist/matches/match.entity');
const { VideoCall } = require('../dist/messages/video-call.entity');
const { AuditLog } = require('../dist/platform/audit-log.entity');
const { io } = require('../../connect-love-fronted/node_modules/socket.io-client');
const prefix = `agentmanagement-${randomUUID()}`;
const userIds = [], agentIds = [];
let app, db, socket;
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
async function run() {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  db = app.get(DataSource); const url = await app.getUrl(); const jwt = new JwtService();
  const userToken = user => jwt.sign({ sub: user.id, role: user.role }, { secret: process.env.JWT_SECRET, expiresIn: '10m' });
  const agentToken = agent => jwt.sign({ sub: agent.id, version: 0 }, { secret: `${process.env.JWT_SECRET.trim()}:connectlove-agent`, audience: 'agent', expiresIn: '10m' });
  async function req(path, token, body, status = 200, method) {
    const res = await fetch(url + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await res.json(); assert.equal(res.status, status, `${path}: ${res.status} ${data.message || ''}`); return data;
  }
  async function makeAgent(suffix) { const agent = await db.getRepository(Agent).save({ name: `${prefix} ${suffix}`, email: `${prefix}-${suffix}@example.invalid`, password: 'not-a-login' }); agentIds.push(agent.id); return agent; }
  async function makeUser(suffix, role = 'user', agent = null) {
    const user = await db.getRepository(User).save({ name: `${prefix} ${suffix}`, email: `${prefix}-${suffix}@example.invalid`, password: 'not-a-login', role, status: 'active', birthDate: '1995-01-01', gender: 'male', city: 'Mumbai', createdByAgentId: agent?.id || null, notifyPush: false, notifyMessages: false }); userIds.push(user.id); return user;
  }
  const a = await makeAgent('agent-a'), b = await makeAgent('agent-b');
  const own = await makeUser('own', 'user', a), other = await makeUser('other', 'user', b), direct = await makeUser('direct');
  const admin = await makeUser('superadmin', 'super_admin'), support = await makeUser('support', 'support');
  const at = agentToken(a), bt = agentToken(b), st = userToken(admin), ut = userToken(own);
  const match = await db.getRepository(MatchRelation).save({ senderId: own.id, receiverId: other.id, status: 'MATCHED' });
  await db.getRepository(MatchRelation).save({ senderId: own.id, receiverId: direct.id, status: 'PENDING' });
  const start = new Date('2026-11-01T10:00:00Z');
  await db.getRepository(VideoCall).save([
    { conversationId: match.id, callerId: own.id, receiverId: other.id, callType: 'audio', status: 'ended', startedAt: start, endedAt: new Date(start.getTime() + 90000) },
    { conversationId: match.id, callerId: other.id, receiverId: own.id, callType: 'video', status: 'ended', startedAt: start, endedAt: new Date(start.getTime() + 120000) },
    ...Array.from({ length: 28 }, () => ({ conversationId: match.id, callerId: own.id, receiverId: other.id, callType: 'audio', status: 'missed', startedAt: null, endedAt: null })),
  ]);
  const details = await req(`/agents/users/${own.id}`, at);
  assert.equal(details.user.activity.friendCount, 1); assert.equal(details.user.activity.friends[0].id, other.id);
  assert.equal(details.user.activity.summary.audioSeconds, 90); assert.equal(details.user.activity.summary.videoSeconds, 120);
  assert.equal(details.user.activity.contacts[0].name, other.name); assert.equal(details.user.activity.calls.length, 25);
  const second = await req(`/agents/users/${own.id}/activity?page=2`, at); assert.equal(second.calls.length, 5); assert.equal(second.page, 2);
  await req(`/agents/users/${own.id}/activity`, bt, undefined, 404);
  for (const target of [other, direct, admin]) {
    await req(`/agents/users/${target.id}/ban`, at, {}, 404);
    await req(`/agents/users/${target.id}/delete`, at, {}, 404);
  }
  const list = await req(`/api/users?search=${encodeURIComponent(prefix)}`, st);
  const listed = list.users.find(user => user.id === own.id); assert.equal(listed.createdByAgent.id, a.id); assert.equal(listed.createdByAgent.email, a.email);
  assert.equal(list.users.find(user => user.id === direct.id).registrationSource, 'direct');
  const byAgent = await req(`/api/users?search=${encodeURIComponent(a.email)}`, st);
  assert.ok(byAgent.users.some(user => user.id === own.id), 'Super Admin can search users by their creator agent');
  const adminDetails = await req(`/api/users/${own.id}`, st); assert.equal(adminDetails.user.createdByAgent.id, a.id); assert.equal(adminDetails.user.activity.friendCount, 1);
  const dashboard = await req('/api/dashboard', st);
  assert.ok(Number(dashboard.stats.find(stat => stat.label === 'Agent-created Users').value) >= 2);
  await req(`/api/users/${own.id}/activity`, userToken(support), undefined, 403);
  const forgedRole = jwt.sign({ sub: direct.id, role: 'super_admin' }, { secret: process.env.JWT_SECRET, expiresIn: '10m' });
  await req('/api/users', forgedRole, undefined, 403);
  await req(`/api/users/${own.id}`, userToken(support), { photos: [photo] }, 403, 'PATCH');
  await req(`/api/users/${own.id}`, st, { photos: [photo], isVerified: true }, 200, 'PATCH');
  assert.equal((await req(`/api/users/${own.id}`, st)).user.photos[0], photo);
  assert.equal((await db.getRepository(User).findOneByOrFail({ id: own.id })).isVerified, false);
  await req(`/api/users/${own.id}`, st, { photos: [] }, 200, 'PATCH');
  assert.deepEqual((await req(`/api/users/${own.id}`, st)).user.photos, []);
  await req(`/api/users/${own.id}`, st, { photos: Array(11).fill(photo) }, 400, 'PATCH');
  socket = io(url, { auth: { token: ut }, transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Socket did not connect')), 10000); socket.once('connect', () => { clearTimeout(timer); resolve(); }); socket.once('connect_error', reject); });
  const activeCall = await db.getRepository(VideoCall).save({ conversationId: match.id, callerId: own.id, receiverId: other.id, callType: 'audio', status: 'active', startedAt: new Date(Date.now() - 30000) });
  const ringingCall = await db.getRepository(VideoCall).save({ conversationId: match.id, callerId: other.id, receiverId: own.id, callType: 'video', status: 'ringing' });
  const disconnected = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Banned socket was not disconnected')), 10000); socket.once('disconnect', () => { clearTimeout(timer); resolve(); }); });
  await req(`/agents/users/${own.id}/ban`, at, {}, 201);
  assert.equal((await db.getRepository(VideoCall).findOneByOrFail({ id: activeCall.id })).status, 'ended');
  assert.equal((await db.getRepository(VideoCall).findOneByOrFail({ id: ringingCall.id })).status, 'missed');
  await req('/users/me', ut, undefined, 401);
  await req('/discovery', ut, undefined, 401);
  await disconnected;
  assert.equal((await req(`/api/users/${own.id}`, st)).user.status, 'Banned');
  const beforeOther = await db.getRepository(User).findOneByOrFail({ id: other.id }); assert.equal(beforeOther.status, 'active');
  await req(`/agents/users/${own.id}/delete`, at, {}, 201);
  assert.equal(await db.getRepository(User).countBy({ id: own.id }), 0);
  assert.equal(await db.getRepository(VideoCall).countBy({ callerId: own.id }), 0);
  assert.equal(await db.getRepository(User).countBy({ id: other.id }), 1);
  await req(`/agents/users/${own.id}`, at, undefined, 404);
  console.log('PASS: own-user ban/delete, cross-agent and direct-user protection, exact call durations and pagination, friends, admin origin attribution, photo add/remove and authorization, banned HTTP/socket sessions, cascading deletion.');
}
run().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(async () => {
  if (socket) socket.disconnect();
  if (db) {
    if (userIds.length) { await db.getRepository(AuditLog).delete({ userId: In(userIds) }); await db.getRepository(User).delete({ id: In(userIds) }); }
    if (agentIds.length) await db.getRepository(Agent).delete({ id: In(agentIds) });
  }
  if (app) await app.close();
});
