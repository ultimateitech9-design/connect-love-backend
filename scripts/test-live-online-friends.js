// No database or network access. Socket room membership is the live source.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MessagesGateway } = require('../dist/messages/messages.gateway');

function fixture() {
  const connected = [];
  // Jai's saved database flag is intentionally true, but is never consulted.
  const savedFlags = { jai: true };
  const users = {
    visibleOnlineUserIds: async ids => ids.filter(id => !['private', 'inactive'].includes(id)),
  };
  const matches = {
    presenceRecipients: async () => ['jai', 'riya', 'private', 'inactive'].map(id => ({ senderId: 'viewer', receiverId: id })),
  };
  const gateway = new MessagesGateway({}, {}, users, matches, {}, {});
  gateway.connectedUsers.set('viewer', new Set(['viewer-socket']));
  gateway.server = { in: rooms => ({
    fetchSockets: async () => connected.filter(socket => rooms.includes('user:' + socket.data.userId)),
  }) };
  const client = { id: 'viewer-socket' };
  const add = (id, userId) => connected.push({ id, data: { userId } });
  return { gateway, connected, client, add, savedFlags };
}

test('stale saved online flag never puts an offline friend in the snapshot', async () => {
  const f = fixture();
  assert.equal(f.savedFlags.jai, true);
  assert.deepEqual((await f.gateway.onlineFriendsSnapshot(f.client)).userIds, []);
});
test('only live matched users who expose online status appear', async () => {
  const f = fixture();
  for (const id of ['jai', 'riya', 'private', 'inactive', 'stranger']) f.add(id, id);
  assert.deepEqual((await f.gateway.onlineFriendsSnapshot(f.client)).userIds, ['jai', 'riya']);
});
test('multiple devices count once; friend disappears when last device disconnects', async () => {
  const f = fixture();
  f.add('phone', 'jai'); f.add('laptop', 'jai');
  assert.deepEqual((await f.gateway.onlineFriendsSnapshot(f.client)).userIds, ['jai']);
  f.connected.splice(0, 1);
  assert.deepEqual((await f.gateway.onlineFriendsSnapshot(f.client)).userIds, ['jai']);
  f.connected.splice(0, 1);
  assert.deepEqual((await f.gateway.onlineFriendsSnapshot(f.client)).userIds, []);
});
test('unauthenticated socket cannot retrieve online friends', async () => {
  const f = fixture(); f.add('phone', 'jai');
  assert.deepEqual((await f.gateway.onlineFriendsSnapshot({ id: 'unknown' })).userIds, []);
});
