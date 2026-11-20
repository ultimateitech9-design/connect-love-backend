// Real MySQL pagination/access regression. All fixtures are rolled back.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('dotenv').config();
const dataSource = require('../dist/data-source').default;
const { MatchesService } = require('../dist/matches/matches.service');
const { MatchRelation } = require('../dist/matches/match.entity');
const { User } = require('../dist/users/user.entity');

test('1005 incoming requests stay bounded, ordered, private and fully pageable', async () => {
  assert.notEqual(process.env.NODE_ENV, 'production', 'local tests only');
  assert.ok(['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost'), 'local database only');
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  await runner.startTransaction();
  try {
    const viewer = randomUUID();
    const peers = Array.from({ length: 1060 }, () => randomUUID());
    const users = [viewer, ...peers].map((id, index) => [id, `pagination-test-${index}`, `${id}@example.invalid`, 'not-a-login', '1995-01-01', 'male', JSON.stringify(['primary-photo', 'secondary-photo']), 'active']);
    await runner.query(`INSERT INTO users (id,name,email,password,birthDate,gender,photos,status) VALUES ${users.map(() => '(?,?,?,?,?,?,?,?)').join(',')}`, users.flat());
    const incoming = peers.slice(0, 1005).map(peer => [randomUUID(), peer, viewer, 'PENDING', false, null, null]);
    const outgoing = peers.slice(1005, 1052).map((peer, index) => [randomUUID(), viewer, peer, 'PENDING', index >= 24, null, null]);
    const active = peers.slice(1052, 1055).map(peer => [randomUUID(), viewer, peer, 'MATCHED', false, null, null]);
    const hidden = [randomUUID(), viewer, peers[1055], 'MATCHED', false, null, JSON.stringify([viewer])];
    const blocks = [
      [randomUUID(), viewer, peers[1056], 'BLOCKED', false, viewer, null],
      [randomUUID(), peers[1057], viewer, 'BLOCKED', false, peers[1057], null],
    ];
    const rows = [...incoming, ...outgoing, ...active, hidden, ...blocks];
    await runner.query(`INSERT INTO matches (id,senderId,receiverId,status,isSuperLike,blockedByUserId,hiddenFromChatForUserIds) VALUES ${rows.map(() => '(?,?,?,?,?,?,?)').join(',')}`, rows.flat());
    const repository = runner.manager.getRepository(MatchRelation);
    const service = new MatchesService(repository, {
      createQueryBuilder() { throw new Error('Dashboard must not query message history'); },
    }, runner.manager.getRepository(User), {
      get() { throw new Error('Dashboard must use the small plan projection'); },
    });
    assert.deepEqual(await service.getSummary(viewer), { active: 3, received: 1005, sent: 47, sentSuper: 23, blocked: 1 });
    let result = await service.dashboardPage(viewer, 'received', 0, 20);
    assert.equal(result.items.length, 20);
    assert.equal(result.hasMore, true);
    assert.ok(result.items.every(row => row.locked && row.sender.id === null && row.sender.photos.length === 0), 'free plan privacy retained');
    await runner.query('UPDATE users SET gender = ? WHERE id = ?', ['female', viewer]);
    const seen = new Set();
    let previousId;
    const started = performance.now();
    for (let page = 0; ; page++) {
      result = await service.dashboardPage(viewer, 'received', page, 20);
      assert.ok(result.items.length <= 20);
      for (const row of result.items) {
        assert.equal(row.locked, false);
        assert.deepEqual(row.sender.photos, ['primary-photo']);
        assert.equal(row.receiver, null, 'own photos are not repeated in every card');
        assert.equal(seen.has(row.id), false, 'no duplicate rows across page boundaries');
        if (previousId) assert.ok(previousId > row.id, 'creation-time ties use stable descending IDs');
        previousId = row.id;
        seen.add(row.id);
      }
      if (!result.hasMore) break;
    }
    assert.equal(seen.size, 1005, 'every request remains reachable');
    console.log(`Traversed 1005 requests in 51 bounded pages in ${Math.round(performance.now() - started)}ms (local test DB).`);
    result = await service.dashboardPage(viewer, 'sent', 0, 20, 'super');
    assert.equal(result.items.length, 20);
    assert.ok(result.items.every(row => row.isSuperLike));
    assert.equal((await service.dashboardPage(viewer, 'sent', 1, 20, 'super')).items.length, 3);
    result = await service.dashboardPage(viewer, 'sent', 0, 20, 'normal');
    assert.ok(result.items.every(row => !row.isSuperLike));
    assert.equal((await service.dashboardPage(viewer, 'sent', 1, 20, 'normal')).items.length, 4);
    assert.equal((await service.dashboardPage(viewer, 'blocked')).items.length, 1);
    await runner.query('UPDATE users SET gender = ? WHERE id = ?', ['male', viewer]);
    result = await service.dashboardPage(viewer, 'active');
    assert.equal(result.items.length, 3, 'hidden conversations stay excluded');
    assert.equal(result.items.filter(row => row.locked).length, 1, 'free members retain exactly two unlocked matches');
    await runner.query('UPDATE users SET plan = ? WHERE id = ?', ['gold', viewer]);
    assert.ok((await service.dashboardPage(viewer, 'active')).items.every(row => !row.locked), 'paid access remains intact');
    const compact = await service.findForFilter(viewer, 'received', 12, 0, true);
    assert.equal(compact.length, 12);
    assert.ok(compact.every(row => row.sender === null && row.receiver === null), 'header notifications omit profile/photo payloads');
    result = await service.dashboardPage(viewer, 'sent', -2, 10000);
    assert.equal(result.page, 0); assert.equal(result.pageSize, 100);
    await assert.rejects(service.dashboardPage(viewer, 'invalid'), /Invalid match tab/);
    assert.equal((await service.dashboardPage(randomUUID(), 'sent')).items.length, 0, 'other accounts cannot see these requests');
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await dataSource.destroy();
  }
});
