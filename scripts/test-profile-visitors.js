// Local integration tests; all synthetic users and visits are rolled back.
const assert = require('node:assert/strict');
const { randomUUID, randomFillSync } = require('node:crypto');
const sharp = require('sharp');
const ds = require('../dist/data-source').default;
const { User } = require('../dist/users/user.entity');
const { ProfileView } = require('../dist/users/profile-view.entity');
const { MatchRelation } = require('../dist/matches/match.entity');
const { CoinTransaction } = require('../dist/users/coin-transaction.entity');
const { UsersService } = require('../dist/users/users.service');

(async () => {
  if (!['localhost', '127.0.0.1', '::1'].includes(ds.options.host)) throw Error('Local DB required');
  await ds.initialize();
  const runner = ds.createQueryRunner(); await runner.connect(); await runner.startTransaction();
  try {
    const users = runner.manager.getRepository(User);
    const views = runner.manager.getRepository(ProfileView);
    const matches = runner.manager.getRepository(MatchRelation);
    const service = new UsersService(users, matches, views, runner.manager.getRepository(CoinTransaction), ds, {});
    const make = name => users.save(users.create({ name, email: randomUUID() + '@example.invalid', password: 'test-not-login-hash', role: 'user', status: 'active', birthDate: new Date('1998-01-01'), gender: 'male', photosVisibleToNonMatches: true }));
    const owner = await make('Kiran test'), visitor = await make('Rani test');
    const original = await sharp(randomFillSync(Buffer.alloc(80 * 80 * 3)), { raw: { width: 80, height: 80, channels: 3 } }).png().toBuffer();
    await users.update(visitor.id, { photos: ['data:image/png;base64,' + original.toString('base64')] });
    let changes = 0; service.profileVisitorEvents.on('changed', () => changes++);
    await service.recordProfileView(owner.id, visitor.id);
    assert.equal((await service.profileVisitors(owner.id)).items.length, 0, 'Passive impressions must not populate visitors');
    await service.recordProfileView(owner.id, visitor.id, true);
    await service.recordProfileView(owner.id, visitor.id, true);
    assert.equal(changes, 1, 'Repeated detail openings do not duplicate notifications/entries');
    const free = await service.profileVisitors(owner.id);
    assert.equal(free.locked, true); assert.equal(free.items.length, 1);
    assert(!('name' in free.items[0])); assert(!('userId' in free.items[0]));
    assert(!JSON.stringify(free).includes(visitor.id)); assert(!JSON.stringify(free).includes(visitor.name));
    const blurred = Buffer.from(free.items[0].photo.split(',')[1], 'base64');
    const stats = await sharp(blurred).stats();
    assert(stats.channels.slice(0, 3).every(channel => channel.stdev < 10), 'Free preview is blurred by the server');
    await assert.rejects(() => service.profileVisitorDetails(owner.id, visitor.id), /Activate Gold/);
    await users.update(owner.id, { plan: 'gold', planExpiresAt: new Date(Date.now() + 86400000) });
    const paid = await service.profileVisitors(owner.id);
    assert.equal(paid.locked, false); assert.equal(paid.items[0].name, visitor.name); assert.equal(paid.items[0].userId, visitor.id);
    assert.equal((await service.profileVisitorDetails(owner.id, visitor.id)).id, visitor.id);
    await users.update(owner.id, { planExpiresAt: new Date(Date.now() - 1000) });
    assert.equal((await service.profileVisitors(owner.id)).locked, true);
    await assert.rejects(() => service.profileVisitorDetails(owner.id, visitor.id), /Activate Gold/);
    await users.update(owner.id, { plan: 'platinum', planExpiresAt: new Date(Date.now() + 86400000) });
    for (let i = 0; i < 8; i++) {
      const person = await make('Extra visitor ' + i);
      await service.recordProfileView(owner.id, person.id, true);
    }
    const page = await service.profileVisitors(owner.id, 0, 6);
    assert.equal(page.items.length, 6); assert.equal(page.hasMore, true);
    const second = await service.profileVisitors(owner.id, page.nextOffset, 6);
    assert.equal(second.items.length, 3);
    assert(!second.items.some(item => page.items.some(first => first.userId === item.userId)));
    await matches.save(matches.create({ senderId: visitor.id, receiverId: owner.id, status: 'BLOCKED' }));
    assert(!(await service.profileVisitors(owner.id)).items.some(item => item.userId === visitor.id));
    await assert.rejects(() => service.profileVisitorDetails(owner.id, visitor.id), /unavailable/);
    console.log('Passed: click-only visits, deduplication, real server blur, no free identity leakage, Gold/Diamond unlock, expiry, pagination and block checks.');
  } finally { await runner.rollbackTransaction(); await runner.release(); console.log('Synthetic data rolled back.'); }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => ds.isInitialized ? ds.destroy() : undefined);
