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
const { SendAdminEmailDto, EmailRecipientsQueryDto } = require('../dist/admin-email/admin-email.dto');

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
  console.log('PASS: gender filters, pagination, all-page selection, exclusions, idempotency, image validation, private delivery, HTML escaping, concurrent claims, failures, crash recovery, DTO validation. No real emails sent.');
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
