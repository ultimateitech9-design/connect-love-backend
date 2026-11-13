// Local integration test: creates uniquely named fixtures, intercepts email, then removes fixtures.
// Run after build + migrations: node scripts/test-agent-portal.js
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Run only against a local development database.');
process.env.TYPEORM_MIGRATIONS_RUN = 'false';
process.env.SEARCH_URL = '';
process.env.SMTP_HOST = 'test.invalid'; process.env.SMTP_USER = 'test@example.invalid'; process.env.SMTP_PASSWORD = 'test-only';
const emails = new Map();
require('nodemailer').createTransport = () => ({ sendMail: async message => { emails.set(message.to, message.text.match(/code is (\d{6})/)[1]); }, close() {} });
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource, Like, In } = require('typeorm');
const { AppModule } = require('../dist/app.module');
const { Agent, AgentEmailChallenge } = require('../dist/agents/agent.entity');
const { User } = require('../dist/users/user.entity');
const { AuditLog } = require('../dist/platform/audit-log.entity');
const prefix = `agenttest-${randomUUID()}`;
let app;
async function run() {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const origin = await app.getUrl();
  const db = app.get(DataSource);
  async function request(route, { body, token, status = 200 } = {}) {
    const response = await fetch(`${origin}${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    assert.equal(response.status, status, `${route}: ${JSON.stringify(result)}`);
    return result;
  }
  const password = 'Strong-Test-Password-86';
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  async function registerAgent(suffix) {
    const email = `${prefix}-${suffix}@example.invalid`;
    await request('/agents/auth/signup-otp', { body: { email }, status: 201 });
    const otp = emails.get(email); assert.match(otp, /^\d{6}$/);
    await request('/agents/auth/signup-otp', { body: { email }, status: 429 });
    await request('/agents/auth/register', { body: { name: 'Test Agent', email, password, otp: '000000' }, status: 401 });
    const challenge = await db.getRepository(AgentEmailChallenge).findOneByOrFail({ email, purpose: 'signup' });
    assert.equal(challenge.attempts, 1, 'Incorrect OTP attempts must persist');
    const session = await request('/agents/auth/register', { body: { name: 'Test Agent', email, password, otp }, status: 201 });
    assert.ok(session.token); assert.equal(session.agent.password, undefined);
    await request('/agents/auth/register', { body: { name: 'Test Agent', email, password, otp }, status: 401 });
    return { ...session, email };
  }
  try {
    await request('/agents/users', { status: 401 });
    const first = await registerAgent('a'); const second = await registerAgent('b');
    const token = first.token;
    await request('/agents/auth/login', { body: { email: first.email, password: 'Incorrect-password' }, status: 401 });
    await request('/agents/auth/login', { body: { email: first.email.toUpperCase(), password } });
    const draft = (suffix, gender = 'female') => ({ name: `${prefix} ${suffix}`, email: `${prefix}-${suffix}@example.invalid`, password, birthDate: '1998-04-15', gender, city: 'Mumbai', bio: 'Integration test profile' });
    await request('/agents/users/bulk', { token, body: { users: [draft('no-consent')], consentConfirmed: false }, status: 400 });
    await request('/agents/users/bulk', { token, body: { users: [{ ...draft('minor'), birthDate: new Date().toISOString().slice(0, 10) }], consentConfirmed: true }, status: 400 });
    await request('/agents/users/bulk', { token, body: { users: [{ ...draft('injection'), role: 'super_admin' }], consentConfirmed: true }, status: 400 });
    await request('/agents/users/bulk', { token, body: { users: [draft('repeat'), draft('repeat')], consentConfirmed: true }, status: 400 });
    const created = await request('/agents/users/bulk', { token, body: { users: [draft('one', 'male'), { ...draft('two'), photos: [photo] }], consentConfirmed: true }, status: 201 });
    assert.equal(created.users.length, 2);
    const owned = await request('/agents/users', { token });
    assert.equal(owned.totalAccounts, 2); assert.equal(owned.activeAccounts, 2);
    assert.equal(owned.users[0].password, undefined); assert.equal(owned.users[0].kycLivePhoto, undefined);
    const other = await request('/agents/users', { token: second.token }); assert.equal(other.totalAccounts, 0);
    const details = await request(`/agents/users/${created.users[0].id}`, { token }); assert.equal(details.user.email, draft('one').email); assert.equal(details.user.password, undefined);
    await request(`/agents/users/${created.users[0].id}`, { token: second.token, status: 404 });
    const withPhoto = await request(`/agents/users/${created.users[1].id}`, { token });
    assert.deepEqual(withPhoto.user.photos, [photo], 'Photos must persist during bulk creation');
    await request(`/agents/users/${created.users[0].id}/photo`, { token: second.token, body: { photo }, status: 404 });
    await request(`/agents/users/${created.users[0].id}/photo`, { token, body: { photo: 'not-an-image' }, status: 400 });
    const savedPhoto = await request(`/agents/users/${created.users[0].id}/photo`, { token, body: { photo }, status: 201 });
    assert.deepEqual(savedPhoto.user.photos, [photo], 'Agent must be able to repair a missing profile photo');
    const searched = await request('/agents/users?search=two&limit=1', { token }); assert.equal(searched.total, 1);
    await request('/agents/users?page=0', { token, status: 400 });
    await request('/agents/users/bulk', { token, body: { users: [draft('rollback'), draft('one')], consentConfirmed: true }, status: 409 });
    assert.equal(await db.getRepository(User).countBy({ email: draft('rollback').email }), 0, 'Duplicate email must roll back the whole batch');
    const userLogin = await request('/auth/login', { body: { email: draft('one').email, password } });
    assert.ok(userLogin.access_token, 'Agent-created user must use normal login');
    await request('/agents/users', { token: userLogin.access_token, status: 401 });
    await request('/users/me', { token, status: 401 });
    const profile = await request('/users/me', { token: userLogin.access_token }); assert.deepEqual(profile.photos, [photo]);
    const discover = await request(`/discovery?search=${encodeURIComponent(prefix)}&interestedIn=everyone`, { token: userLogin.access_token });
    assert.ok(discover.some(user => user.id === created.users[1].id), 'Created users must appear in existing discovery');
    const discovered = discover.find(user => user.id === created.users[1].id);
    assert.equal(discovered.photo, photo, 'Discover must return the photo saved by the agent');
    assert.deepEqual(discovered.photos, [photo]);
    assert.equal(discovered.photosVisibleToNonMatches, true);
    await db.getRepository(User).update(created.users[0].id, { onboardingCompleted: true, photosVisibleToNonMatches: false, isVerified: true, kycMatched: true });
    const replacement = photo.replace('image/png', 'image/webp');
    await request(`/agents/users/${created.users[0].id}/photo`, { token, body: { photo: replacement }, status: 201 });
    const replaced = await db.getRepository(User).findOneByOrFail({ id: created.users[0].id });
    assert.equal(replaced.photosVisibleToNonMatches, false, 'Preserve a member privacy preference when replacing a photo');
    assert.equal(replaced.isVerified, false, 'Replacing a verified primary photo must clear verification');
    assert.equal(replaced.kycMatched, false);
    await request('/agents/auth/forgot-password', { body: { email: first.email }, status: 201 });
    const resetOtp = emails.get(first.email);
    await request('/agents/auth/register', { body: { name: 'Test Agent', email: first.email, password, otp: resetOtp }, status: 401 });
    const newPassword = 'New-Test-Password-98';
    await request('/agents/auth/reset-password', { body: { email: first.email, otp: resetOtp, password: newPassword }, status: 201 });
    await request('/agents/me', { token, status: 401 });
    await request('/agents/auth/reset-password', { body: { email: first.email, otp: resetOtp, password }, status: 401 });
    await request('/agents/auth/login', { body: { email: first.email, password }, status: 401 });
    const updated = await request('/agents/auth/login', { body: { email: first.email, password: newPassword } });
    await request('/agents/auth/logout', { token: updated.token, body: {}, status: 201 });
    await request('/agents/me', { token: updated.token, status: 401 });
    console.log('PASS: email OTP and replay protection, ownership, batch validation and rollback, normal user login, Discover visibility, session isolation, password reset and logout revocation.');
  } finally {
    const users = await db.getRepository(User).find({ where: { email: Like(`${prefix}%`) }, select: ['id'] });
    if (users.length) { await db.getRepository(AuditLog).delete({ userId: In(users.map(user => user.id)) }); await db.getRepository(User).delete({ id: In(users.map(user => user.id)) }); }
    await db.getRepository(AgentEmailChallenge).delete({ email: Like(`${prefix}%`) });
    await db.getRepository(Agent).delete({ email: Like(`${prefix}%`) });
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (app) await app.close(); });
