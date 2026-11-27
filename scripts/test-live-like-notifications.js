// Loopback Socket.IO integration; no database or real accounts are used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { EventEmitter } = require('node:events');
const { Server } = require('socket.io');
const { io } = require('../../connect-love-fronted/node_modules/socket.io-client');
const { JwtService } = require('@nestjs/jwt');
const { MatchesService } = require('../dist/matches/matches.service');
const { MessagesGateway } = require('../dist/messages/messages.gateway');
const { isAllowedOrigin } = require('../dist/common/cors');

function nextEvent(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 3000);
    socket.once(name, value => { clearTimeout(timer); resolve(value); });
  });
}

test('committed likes reach only authenticated participants over websocket and polling', async t => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'loopback-notification-test-only';
  t.after(() => { if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret; });
  const http = createServer();
  const server = new Server(http, { cors: { origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), credentials: true } });
  let current = null;
  let holdSave;
  let failSave = false;
  const builder = { where() { return this; }, andWhere() { return this; }, getCount: async () => 0 };
  const repository = {
    findOne: async () => current,
    createQueryBuilder: () => builder,
    create: value => ({ ...value }),
    async save(value) {
      if (holdSave) await holdSave;
      if (failSave) throw new Error('database unavailable');
      current = { ...value, id: value.id || 'like-1', createdAt: new Date(), updatedAt: new Date() };
      return current;
    },
    async remove() { current = null; },
  };
  const matches = new MatchesService(repository, {}, { findOne: async () => ({ id: 'receiver' }) }, {
    assertAndRecord: async () => {}, get: async () => ({ limits: { matches: 10 } }),
  });
  matches.presenceRecipients = async () => [];
  const users = {
    profileVisitorEvents: new EventEmitter(), isActiveAccount: async () => true,
    updatePresence: async () => {}, visiblePresence: async () => ({}),
  };
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const referrals = { walletEvents: new EventEmitter() };
  const gateway = new MessagesGateway({}, { pendingRingsFor: async () => [] }, users, matches, jwt, {}, referrals);
  gateway.server = server;
  gateway.onModuleInit();
  server.on('connection', socket => { void gateway.handleConnection(socket); });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${http.address().port}`;
  const clients = [];
  t.after(async () => {
    clients.forEach(client => client.disconnect());
    gateway.onModuleDestroy();
    await new Promise(resolve => server.close(resolve));
  });
  async function connect(userId, transport) {
    const client = io(url, {
      autoConnect: false, transports: [transport], reconnectionDelay: 20,
      auth: { token: jwt.sign({ sub: userId }) },
      query: { userId: 'spoofed-user-id' },
    });
    clients.push(client);
    const ready = nextEvent(client, 'presenceReady'); client.connect(); await ready;
    return client;
  }
  const receiver = await connect('receiver', 'websocket');
  const receiverPhone = await connect('receiver', 'polling');
  const sender = await connect('sender', 'websocket');
  const stranger = await connect('stranger', 'websocket');
  let unrelatedWallets = 0;
  stranger.on('referralBalanceChanged', () => unrelatedWallets++);
  const receiverWallet = nextEvent(receiver, 'referralBalanceChanged');
  const phoneWallet = nextEvent(receiverPhone, 'referralBalanceChanged');
  const senderWallet = nextEvent(sender, 'referralBalanceChanged');
  referrals.walletEvents.emit('changed', 'receiver');
  referrals.walletEvents.emit('changed', 'sender');
  await Promise.all([receiverWallet, phoneWallet, senderWallet]);
  assert.equal(unrelatedWallets, 0, 'only both credited users receive balance refresh events across their devices');
  let unrelated = 0;
  stranger.on('matchChanged', () => unrelated++);
  let published = 0;
  matches.matchEvents.on('changed', () => published++);
  let release;
  holdSave = new Promise(resolve => { release = resolve; });
  const browserEvent = nextEvent(receiver, 'matchChanged');
  const phoneEvent = nextEvent(receiverPhone, 'matchChanged');
  const senderEvent = nextEvent(sender, 'matchChanged');
  const saving = matches.swipe('sender', 'receiver', 'like');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published, 0, 'nothing published before database commit');
  release(); await saving; holdSave = null;
  const events = await Promise.all([browserEvent, phoneEvent, senderEvent]);
  for (const event of events) {
    assert.equal(event.id, 'like-1'); assert.equal(event.status, 'PENDING');
    assert.equal(event.receiverId, 'receiver'); assert.equal(event.sender, undefined);
  }
  assert.equal(unrelated, 0, 'other users never receive the like');
  await matches.swipe('sender', 'receiver', 'like');
  assert.equal(published, 1, 'retry does not publish a duplicate');
  const removed = nextEvent(receiver, 'matchChanged');
  await matches.deletePendingRequest('like-1', 'sender');
  assert.equal((await removed).status, 'DELETED');
  const beforeFailure = published;
  failSave = true;
  await assert.rejects(matches.swipe('sender', 'receiver', 'like'), /database unavailable/);
  assert.equal(published, beforeFailure, 'failed saves never notify');
  failSave = false;
  const reconnected = nextEvent(receiver, 'presenceReady');
  receiver.io.engine.close(); await reconnected;
  const nextLike = nextEvent(receiver, 'matchChanged');
  await matches.swipe('sender', 'receiver', 'superlike');
  assert.equal((await nextLike).isSuperLike, true, 'delivery resumes after reconnect');
  const matched = nextEvent(receiver, 'matchChanged');
  await matches.swipe('receiver', 'sender', 'like');
  assert.equal((await matched).status, 'MATCHED', 'mutual likes reconcile pending notification');
  const response = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: 'https://connectlove.in' } });
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://connectlove.in');
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(isAllowedOrigin('https://untrusted.example'), false);
  const rejected = io(url, { autoConnect: false, transports: ['websocket'], auth: { token: 'invalid' } });
  clients.push(rejected);
  const disconnected = nextEvent(rejected, 'disconnect'); rejected.connect(); await disconnected;
});
