// Uses isolated temporary local tables and a stub SMTP transport. No real emails.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mysql = require('mysql2/promise');
const { DataSource } = require('typeorm');
const sharp = require('sharp');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const { User } = require('../dist/users/user.entity');
const { AuditLog } = require('../dist/platform/audit-log.entity');
const { AdminEmailCampaign, AdminEmailRecipient } = require('../dist/admin-email/admin-email.entity');
const { AdminEmailService } = require('../dist/admin-email/admin-email.service');
const { SendAdminEmailDto, EmailRecipientsQueryDto, FailedEmailsQueryDto, RetryFailedEmailsDto } = require('../dist/admin-email/admin-email.dto');

if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local database only.');
const prefix = `test_em_${randomUUID().replaceAll('-', '').slice(0, 12)}_`;
const database = process.env.DB_NAME;
const options = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD };
let connection, db;
const tables = ['admin_email_recipients', 'admin_email_campaigns', 'audit_logs', 'users'].map(name => prefix + name);

async function run() {
  connection = await mysql.createConnection({ ...options, database });
  db = new DataSource({ type: 'mysql', host: options.host, port: options.port, username: options.user, password: options.password,
    database, entityPrefix: prefix, entities: [User, AuditLog, AdminEmailCampaign, AdminEmailRecipient], synchronize: false });
  await db.initialize();
  const schema = await db.driver.createSchemaBuilder().log();
  for (const query of schema.upQueries) {
    if (!query.query.startsWith('CREATE TABLE `'+prefix)) throw new Error('Refusing unexpected test schema operation: '+query.query);
    await db.query(query.query, query.parameters);
  }
  const users = db.getRepository(User);
  const women = Array.from({ length: 53 }, (_, i) => ({ id: randomUUID(), name: `Woman ${i}`, email: `woman${String(i).padStart(2, '0')}@example.test`, password: 'unused', gender: i === 0 ? ' WOMEN ' : 'female' }));
  const man = { id: randomUUID(), name: 'Man', email: 'man@example.test', password: 'unused', gender: 'male' };
  const other = { id: randomUUID(), name: 'Other', email: 'other@example.test', password: 'unused', gender: 'non-binary' };
  const admin = { id: randomUUID(), name: 'Admin', email: 'admin@example.test', password: 'unused', gender: 'female', role: 'super_admin' };
  await users.insert([...women, man, other, admin].map(user => ({ ...user })));
  const jobs = db.getRepository(AdminEmailCampaign), deliveries = db.getRepository(AdminEmailRecipient);
  const service = new AdminEmailService(users, jobs, deliveries, db);
  process.env.SMTP_HOST = 'test.invalid'; process.env.SMTP_USER = 'test@example.test'; process.env.SMTP_PASSWORD = 'unused';
  const sent = [];
  const transport = { sendMail: async mail => {
    sent.push(mail);
    if (mail.to === man.email) throw new Error('Simulated rejection');
    return { accepted: [mail.to], rejected: [] };
  } };
  service.mailer = () => transport;

  assert.equal((await service.recipients({ audience: 'all', page: 1 })).total, 55);
  const first = await service.recipients({ audience: 'female', page: 1 });
  assert.equal(first.total, 53); assert.equal(first.users.length, 50);
  assert.equal((await service.recipients({ audience: 'female', page: 2 })).users.length, 3);
  assert.equal((await service.recipients({ audience: 'male', page: 1 })).total, 1);
  assert.equal((await service.recipients({ audience: 'all', search: '%', page: 1 })).total, 0);
  const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'pink' } }).png().toBuffer();
  const dto = { requestId: randomUUID(), audience: 'female', search: '', selectAll: true, excludedUserIds: [women[0].id], subject: 'Hello <members>', message: '<script>alert(1)</script>\nSecond line', imageDataUrl: `data:image/png;base64,${image.toString('base64')}` };
  const [a, b] = await Promise.all([service.enqueue(dto, admin.id), service.enqueue(dto, admin.id)]);
  assert.equal(a.id, b.id, 'concurrent duplicate submissions produce one campaign');
  assert.equal(a.total, 52, 'all pages selected, one user excluded');
  assert.equal(await jobs.count(), 1);
  assert.equal(await deliveries.count(), 52);
  assert.equal(await db.getRepository(AuditLog).count(), 1);
  assert.equal(await deliveries.countBy({ userId: women[0].id }), 0);
  assert.equal((await jobs.findOneBy({ id: a.id })).imageBase64, undefined, 'images omitted from normal queries');
  await assert.rejects(service.enqueue({ ...dto, requestId: randomUUID(), selectAll: false, userIds: [man.id] }, admin.id), /no longer available/);
  await assert.rejects(service.enqueue({ ...dto, requestId: randomUUID(), imageDataUrl: 'data:image/png;base64,YmFk' }, admin.id), /could not be read/);
  await assert.rejects(service.enqueue({ ...dto, requestId: randomUUID(), subject: 'Header\r\ninjection' }, admin.id), /single line/);
  const secondService = new AdminEmailService(users, jobs, deliveries, db);
  secondService.mailer = () => transport;
  while ((await service.campaign(a.id)).pending) await Promise.all([service.processQueue(), secondService.processQueue()]);
  const done = await service.campaign(a.id);
  assert.equal(done.sent, 52); assert.equal(done.failed, 0);
  assert.equal(sent.length, 52, 'concurrent workers do not duplicate recipients');
  assert(sent.every(mail => typeof mail.to === 'string' && !mail.cc && !mail.bcc));
  assert(sent.every(mail => mail.attachments[0].cid === 'campaign-photo'));
  assert(sent[0].html.includes('&lt;script&gt;')); assert(!sent[0].html.includes('<script>'));
  assert(sent[0].html.includes('cid:campaign-photo'));
  const manual = await service.enqueue({ ...dto, imageDataUrl: undefined, requestId: randomUUID(), audience: 'all', selectAll: false, userIds: [man.id, other.id] }, admin.id);
  await service.processQueue();
  const failed = await service.campaign(manual.id);
  assert.equal(failed.sent, 1); assert.equal(failed.failed, 1); assert.equal(failed.failures[0].email, man.email);
  const calls = sent.length;
  await service.processQueue(); assert.equal(sent.length, calls, 'failed deliveries are not silently retried');
  const interrupted = await service.enqueue({ ...dto, imageDataUrl: undefined, requestId: randomUUID(), selectAll: false, userIds: [women[0].id] }, admin.id);
  await deliveries.update({ campaignId: interrupted.id }, { status: 'sending', attemptedAt: new Date(Date.now() - 11 * 60000) });
  await service.processQueue(); assert.equal((await service.campaign(interrupted.id)).failed, 1);
  assert.equal(sent.length, calls, 'uncertain deliveries never automatically resend');
  const invalid = plainToInstance(SendAdminEmailDto, { ...dto, subject: ' ', selectAll: 'true', audience: 'invalid' });
  assert((await validate(invalid)).length >= 3);
  assert((await validate(plainToInstance(EmailRecipientsQueryDto, { page: '-1' }))).length);
  assert.equal((await validate(plainToInstance(EmailRecipientsQueryDto, { audience: 'inactive' }))).length, 0);
  const now = Date.now();
  const cutoff = now - 7 * 86400000;
  const inactiveFixtures = [
    { name: 'Inactive Woman', gender: 'female', lastSeen: new Date(cutoff - 86400000), createdAt: new Date(cutoff - 86400000) },
    { name: 'Inactive Man', gender: 'male', lastSeen: new Date(cutoff - 86400000), createdAt: new Date(cutoff - 86400000) },
    { name: 'Inactive Boundary', gender: 'female', lastSeen: new Date(Math.floor(cutoff / 1000) * 1000), createdAt: new Date(cutoff - 86400000) },
    { name: 'Inactive Never Seen', gender: 'male', lastSeen: null, createdAt: new Date(cutoff - 86400000) },
    { name: 'Inactive Recent', gender: 'female', lastSeen: new Date(cutoff + 60000), createdAt: new Date(cutoff - 86400000) },
    { name: 'Inactive New', gender: 'male', lastSeen: null, createdAt: new Date(now) },
    { name: 'Inactive Online', gender: 'female', lastSeen: new Date(cutoff - 86400000), createdAt: new Date(cutoff - 86400000), isOnline: true },
  ].map((user, i) => ({ id: randomUUID(), email: `inactive${i}@example.test`, password: 'unused', ...user }));
  await users.insert(inactiveFixtures.map(user => ({ ...user })));
  const inactiveQuery = { audience: 'inactive', search: 'Inactive', page: 1 };
  const inactive = await service.recipients(inactiveQuery);
  assert.equal(inactive.total, 4, 'inactive includes both genders, seven-day boundary and old never-seen accounts only');
  assert.deepEqual(new Set(inactive.users.map(user => user.name)), new Set(inactiveFixtures.slice(0, 4).map(user => user.name)));
  const inactiveCampaign = await service.enqueue({ ...dto, ...inactiveQuery, imageDataUrl: undefined, requestId: randomUUID(), excludedUserIds: [inactiveFixtures[0].id] }, admin.id);
  assert.equal(inactiveCampaign.total, 3, 'inactive select-all applies the same server filter and exclusions');
  assert.deepEqual(new Set((await deliveries.findBy({ campaignId: inactiveCampaign.id })).map(row => row.userId)), new Set(inactiveFixtures.slice(1, 4).map(user => user.id)));
  await assert.rejects(service.enqueue({ ...dto, ...inactiveQuery, requestId: randomUUID(), selectAll: false, userIds: [inactiveFixtures[4].id] }, admin.id), /no longer available/);
  await users.update(inactiveFixtures[1].id, { lastSeen: new Date() });
  assert.equal((await service.recipients(inactiveQuery)).total, 3, 'returning members leave the inactive audience');
  await deliveries.insert(women.slice(1, 52).map(user => ({ id: randomUUID(), campaignId: interrupted.id, userId: user.id, name: user.name, email: user.email, status: 'failed', error: 'Test failure' })));
  await deliveries.insert({ id: randomUUID(), campaignId: interrupted.id, userId: randomUUID(), name: 'Former member', email: 'former@example.test', status: 'failed', error: 'Test failure' });
  const failures = await service.failures({ gender: 'all', page: 1 });
  assert.equal(failures.total, 54, 'only failed attempts are listed, not pending or successful deliveries');
  assert.equal(failures.limit, 10);
  assert.equal(failures.failures.length, 10);
  assert.equal((await service.failures({ gender: 'all', page: 6 })).failures.length, 4);
  const failedWomen = await service.failures({ gender: 'female', page: 1 });
  assert.equal(failedWomen.total, 52, 'women filter normalizes gender aliases');
  assert(failedWomen.failures.every(row => ['female', ' WOMEN '].includes(row.gender)));
  const failedMen = await service.failures({ gender: 'male', page: 1 });
  assert.equal(failedMen.total, 1); assert.equal(failedMen.failures[0].email, man.email);
  assert.equal(failedMen.failures[0].subject, dto.subject);
  assert.equal((await service.failures({ gender: 'all', search: '%', page: 1 })).total, 0);
  const former = await service.failures({ gender: 'all', search: 'former@example.test', page: 1 });
  assert.equal(former.total, 1); assert.equal(former.failures[0].gender, null, 'deleted members remain visible in all failed emails');
  assert.equal((await service.failures({ gender: 'all', search: dto.subject, page: 1 })).total, 54, 'campaign subjects are searchable');
  assert((await validate(plainToInstance(FailedEmailsQueryDto, { gender: 'invalid', page: 0 }))).length >= 2);
  const excluded = (await deliveries.findOneBy({ campaignId: interrupted.id, userId: women[0].id })).id;
  const retryDto = { requestId: randomUUID(), selections: [
    { gender: 'female', search: '', selectAll: true, excludedIds: [excluded] },
    { gender: 'male', search: '', selectAll: true },
  ] };
  const beforeJobs = await jobs.count();
  await jobs.update(interrupted.id, { imageBase64: 'original-photo' });
  const retryResults = await Promise.all([service.retryFailures(retryDto, admin.id), service.retryFailures(retryDto, admin.id)]);
  assert.equal(retryResults.filter(result => !result.alreadyQueued).length, 1, 'concurrent resends queue exactly one batch');
  assert.equal(retryResults.find(result => !result.alreadyQueued).total, 52, 'all pages and both genders selected, exclusion applied');
  assert.equal(await jobs.count(), beforeJobs + 2, 'each original campaign keeps its own message');
  assert.equal((await service.failures({ gender: 'all', page: 1 })).total, 54, 'original failure history is preserved');
  const newJobs = await jobs.createQueryBuilder('c').addSelect('c.imageBase64').where('c.id NOT IN (:...ids)', { ids: [a.id, manual.id, interrupted.id, inactiveCampaign.id] }).getMany();
  assert.equal(newJobs.reduce((sum, job) => sum + job.total, 0), 52);
  assert(newJobs.some(job => job.imageBase64 === 'original-photo'), 'resend preserves original campaign photo');
  assert(newJobs.every(job => job.subject === dto.subject && job.message === dto.message));
  const retried = await deliveries.find({ where: { campaignId: require('typeorm').In(newJobs.map(job => job.id)) } });
  assert(retried.every(row => row.status === 'pending' && row.userId !== women[0].id && row.userId !== other.id), 'sent recipients and excluded failures are not queued');
  assert.equal((await service.retryFailures(retryDto, admin.id)).alreadyQueued, true, 'repeated request does not resend again');
  const sentRecipient = await deliveries.findOneBy({ campaignId: manual.id, userId: other.id });
  await assert.rejects(service.retryFailures({ requestId: randomUUID(), selections: [{ gender: 'male', selectAll: false, ids: [sentRecipient.id] }] }, admin.id), /no longer available/);
  await assert.rejects(service.retryFailures({ requestId: randomUUID(), selections: [{ gender: 'female', selectAll: false, ids: [failedMen.failures[0].id] }] }, admin.id), /no longer available/);
  await assert.rejects(service.retryFailures({ requestId: randomUUID(), selections: [{ gender: 'female', search: 'nothing-matches', selectAll: true }] }, admin.id), /Select at least one/);
  assert((await validate(plainToInstance(RetryFailedEmailsDto, { requestId: randomUUID(), selections: [{ gender: 'all', selectAll: 'yes', ids: ['bad'] }] }))).length);
  console.log('PASS: original-content resend across both genders and all pages, exclusions, sent-recipient protection, concurrent request deduplication, preserved history and retry validation. No real emails sent.');
  console.log('PASS: paginated failed-email history, women/men filters, saved recipient details, campaign search, deleted members, and query validation.');
  console.log('PASS: gender and 7-day inactive filters, pagination, all-page selection, exclusions, idempotency, image validation, private delivery, HTML escaping, concurrent claims, failures, crash recovery, DTO validation. No real emails sent.');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (db?.isInitialized) await db.destroy();
  if (connection) {
    for (const table of tables) {
      if (!/^test_em_[a-f0-9]{12}_(admin_email_recipients|admin_email_campaigns|audit_logs|users)$/.test(table)) throw new Error('Unexpected test table.');
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await connection.end();
  }
});
