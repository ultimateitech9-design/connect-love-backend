// Local MySQL integration check. All synthetic rows are rolled back.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const ds = require('../dist/data-source').default;
const { User } = require('../dist/users/user.entity');
const { MatchRelation } = require('../dist/matches/match.entity');
const { FirstImpression } = require('../dist/first-impressions/first-impression.entity');
const { DiscoveryService } = require('../dist/discovery/discovery.service');
const sharp = require('sharp');
const { randomFillSync } = require('node:crypto');

(async () => {
  if (!['localhost', '127.0.0.1', '::1'].includes(ds.options.host)) throw Error('Test requires a local DB');
  await ds.initialize();
  const runner = ds.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const users = runner.manager.getRepository(User);
    const needle = 'PK Dwivedi ' + randomUUID();
    const makeUser = async (name, extra = {}) => users.save(users.create({
      name, email: randomUUID() + '@example.invalid', password: 'not-a-login-hash',
      birthDate: new Date('1995-01-01'), gender: 'male', city: 'Test city',
      role: 'user', status: 'active', photos: [], ...extra,
    }));
    const viewer = await makeUser('Search regression viewer');
    const scenarios = [
      { label: 'declined', status: 'DECLINED' },
      { label: 'pending', status: 'PENDING' },
      { label: 'matched', status: 'MATCHED' },
      { label: 'outgoing-blocked', status: 'BLOCKED' },
      { label: 'incoming-blocked', status: 'BLOCKED', incoming: true },
      { label: 'first-impression' },
      { label: 'prefer-not', gender: 'prefer-not' },
      { label: 'large-unseen' },
      { label: 'inactive', userStatus: 'banned' },
    ];
    for (const scenario of scenarios) {
      scenario.user = await makeUser(needle, { gender: scenario.gender || 'male', status: scenario.userStatus || 'active' });
      if (scenario.status) await runner.manager.save(MatchRelation, runner.manager.create(MatchRelation, {
        senderId: scenario.incoming ? scenario.user.id : viewer.id,
        receiverId: scenario.incoming ? viewer.id : scenario.user.id, status: scenario.status,
      }));
      if (scenario.label === 'first-impression') await runner.manager.save(FirstImpression, runner.manager.create(FirstImpression, { senderId: viewer.id, receiverId: scenario.user.id, content: 'Test only' }));
    }
    const service = new DiscoveryService(users, { searchUserIds: async () => null });
    const original = await sharp(randomFillSync(Buffer.alloc(512 * 512 * 3)), { raw: { width: 512, height: 512, channels: 3 } }).png().toBuffer();
    await users.update(scenarios[0].user.id, { photos: ['data:image/png;base64,' + original.toString('base64')], photosVisibleToNonMatches: true });
    await users.update(scenarios.find(scenario => scenario.label === 'large-unseen').user.id, { photos: ['data:image/png;base64,' + original.toString('base64')], photosVisibleToNonMatches: true });
    const found = [];
    let cursor;
    do {
      const data = await service.getSuggestions(viewer.id, { nameSearch: true, queue: true, search: needle.toUpperCase().replace(/ /g, '  '), limit: 2, cursor, interestedIn: 'everyone' });
      found.push(...data.items);
      cursor = data.nextCursor;
    } while (cursor);
    assert.equal(new Set(found.map(p => p.id)).size, found.length, 'No duplicate cursor results');
    for (const scenario of scenarios) {
      const expected = !['outgoing-blocked', 'incoming-blocked', 'inactive'].includes(scenario.label);
      assert.equal(found.some(p => p.id === scenario.user.id), expected, scenario.label);
    }
    assert.equal(found.find(p => p.id === scenarios[2].user.id).relationshipStatus, 'MATCHED');
    const full = await service.getSuggestions(viewer.id, { nameSearch: true, queue: true, search: needle });
    const started = Date.now();
    const compact = await service.getSuggestions(viewer.id, { nameSearch: true, queue: true, compact: true, search: needle });
    const elapsedMs = Date.now() - started;
    assert.equal(compact.items.length, full.items.length);
    assert(compact.items.every(profile => !profile.photo && !profile.photos.length));
    assert(JSON.stringify(compact).length * 100 < JSON.stringify(full).length, 'Compact results omit original image bytes');
    const thumbnail = await service.searchThumbnail(viewer.id, scenarios[0].user.id);
    const thumbnailBytes = Buffer.from(thumbnail.photo.split(',')[1], 'base64');
    const meta = await sharp(thumbnailBytes).metadata();
    assert.equal(meta.width, 112); assert.equal(meta.height, 112);
    assert(thumbnailBytes.length < 10000);
    await assert.rejects(() => service.searchThumbnail(viewer.id, scenarios[3].user.id), /unavailable/);
    console.log(JSON.stringify({ compactSearchMs: elapsedMs, fullResponseBytes: Buffer.byteLength(JSON.stringify(full)), compactResponseBytes: Buffer.byteLength(JSON.stringify(compact)), thumbnailBytes: thumbnailBytes.length }));
    const recommended = await service.getSuggestions(viewer.id, { queue: true, search: needle, limit: 24 });
    assert(!recommended.items.some(p => p.id === scenarios[0].user.id), 'Normal queue still excludes passes');
    console.log('Passed: direct name lookup after like/pass/match/first impression; Everyone gender; blocked both directions; inactive exclusion; pagination; original queue exclusions.');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    console.log('Synthetic test data rolled back.');
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => ds.isInitialized ? ds.destroy() : undefined);
