// Local-only browser regression. Creates a temporary CallProvider harness route
// and fixture accounts, then removes both. Media comes from Chromium fake devices.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local development database only.');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const mysql = require('mysql2/promise');
const { JwtService } = require('@nestjs/jwt');
const prefix = `controltest-${randomUUID()}`;
const ids = { agent: randomUUID(), a: randomUUID(), b: randomUUID(), admin: randomUUID(), match: randomUUID() };
const frontend = path.resolve(__dirname, '../../connect-love-fronted');
const routeName = `call-control-test-${randomUUID()}`;
const route = path.resolve(frontend, 'src/app', routeName);
if (!route.startsWith(path.join(frontend, 'src/app') + path.sep)) throw new Error('Invalid test harness path');
let db, browser, currentPage;
async function waitFor(check, message) { for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(message); }

async function run() {
  db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await db.execute('INSERT INTO agents (id,name,email,password) VALUES (?,?,?,?)', [ids.agent, `${prefix} Agent`, `${ids.agent}@example.invalid`, 'not-a-login']);
  for (const [id, role, creator] of [[ids.a, 'user', ids.agent], [ids.b, 'user', null], [ids.admin, 'super_admin', null]]) {
    await db.execute('INSERT INTO users (id,name,email,password,role,status,birthDate,gender,city,onboardingCompleted,notifyMessages,notifyPush,createdByAgentId) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [id, `${prefix} ${id === ids.a ? 'A' : id === ids.b ? 'B' : 'Admin'}`, `${id}@example.invalid`, 'not-a-login', role, 'active', '1995-01-01', 'female', 'Mumbai', true, false, false, creator]);
  }
  await db.execute('INSERT INTO matches (id,senderId,receiverId,status) VALUES (?,?,?,?)', [ids.match, ids.a, ids.b, 'MATCHED']);
  await fs.mkdir(route);
  await fs.writeFile(path.join(route, 'page.tsx'), `'use client';
import { CallProvider, useCall } from '@/features/calls/CallProvider';
import { useState } from 'react';
function Harness() { const call = useCall(); const [error, setError] = useState(''); return <main><p>{call.ready ? 'Ready for call' : 'Connecting'}</p>{error && <p role="alert">{error}</p>}{(['audio','video'] as const).map(type => <button key={type} disabled={!call.ready || call.inCall} onClick={async () => { const config = JSON.parse(localStorage.getItem('calltest-config') || '{}'); const result = await call.startCall({conversationId:config.match,otherUser:config.other,callType:type});setError(result.error || ''); }}>Start {type}</button>)}</main>; }
export default function Page() { const [open, setOpen] = useState(true); return <><button id="leave-provider" onClick={() => setOpen(false)}>Leave provider</button>{open ? <CallProvider><Harness /></CallProvider> : <p>Provider closed</p>}</>; }
`);
  const jwt = new JwtService();
  const token = id => jwt.sign({ sub: id }, { secret: process.env.JWT_SECRET.trim(), expiresIn: '20m' });
  browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'], ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await admin.addCookies(['management_token','management_client_token','management_role'].map(name => ({ name, value: name === 'management_role' ? 'super_admin' : token(ids.admin), domain: 'localhost', path: '/' })));
  const adminPage = await admin.newPage(); currentPage = adminPage; adminPage.setDefaultTimeout(60000);
  await adminPage.goto('http://localhost:3009/super-admin', { waitUntil: 'networkidle', timeout: 120000 });
  await adminPage.getByRole('button', { name: /^Registered Agents \d/ }).click();
  await adminPage.getByRole('heading', { name: 'Registered Agents', exact: true }).waitFor();
  await adminPage.getByRole('textbox', { name: 'Search accounts' }).fill(prefix);
  await adminPage.getByRole('cell', { name: `${prefix} Agent ${ids.agent}@example.invalid` }).waitFor();
  assert.equal(await adminPage.getByText(`${prefix} A`, { exact: true }).count(), 0);
  await adminPage.getByRole('link', { name: 'View created users' }).click();
  await adminPage.getByText(`${prefix} A`, { exact: true }).waitFor();
  assert.equal(await adminPage.getByText(`${prefix} B`, { exact: true }).count(), 0);
  await adminPage.goto('http://localhost:3009/super-admin', { waitUntil: 'networkidle' });
  await adminPage.getByRole('button', { name: /^Active Users \d/ }).click();
  await adminPage.getByRole('heading', { name: 'Active Users & Agents' }).waitFor();
  await adminPage.getByRole('textbox', { name: 'Search accounts' }).fill(prefix);
  for (const suffix of ['A','B','Agent']) await adminPage.getByText(`${prefix} ${suffix}`, { exact: true }).waitFor();
  console.log('PASS: dashboard card navigation, agent-only list, one-agent created users and combined active accounts');
  await admin.close();
  const pages = [];
  for (const [id, other, support] of [[ids.a, ids.b, true], [ids.b, ids.a, false]]) {
    const context = await browser.newContext({ viewport: support ? { width: 1366, height: 900 } : { width: 390, height: 844 }, isMobile: !support, hasTouch: !support, permissions: ['camera','microphone'] });
    await context.addCookies([{ name: 'sm_auth', value: '1', domain: 'localhost', path: '/' }]);
    await context.addInitScript(({ token, match, other, support }) => {
      localStorage.setItem('sm_token', token); localStorage.setItem('calltest-config', JSON.stringify({ match, other }));
      const state = window.__callTest = { tracks: [], peers: [], sinkChanges: [], failCamera: false, failPermission: false, prompts: 0 };
      const Peer = window.RTCPeerConnection;
      window.RTCPeerConnection = class extends Peer { constructor(...args) { super(...args); state.peers.push(this); } };
      const media = navigator.mediaDevices;
      const enumerate = media.enumerateDevices.bind(media), gum = media.getUserMedia.bind(media);
      media.enumerateDevices = async () => {
        const devices = await enumerate();
        if (!support) return devices;
        return [...devices, { deviceId: 'test-rear', groupId: 'test', kind: 'videoinput', label: 'Rear camera (test)' }, { deviceId: 'broken-camera', groupId: 'test', kind: 'videoinput', label: 'Unavailable camera (test)' }, { deviceId: 'test-mic', groupId: 'test', kind: 'audioinput', label: 'Headset microphone (test)' }, { deviceId: 'test-speaker', groupId: 'test', kind: 'audiooutput', label: 'Loudspeaker (test)' }];
      };
      media.getUserMedia = async constraints => {
        if (state.failPermission) { state.failPermission = false; throw new DOMException('Permission denied', 'NotAllowedError'); }
        const config = structuredClone(constraints);
        const cameraId = typeof config.video === 'object' ? config.video.deviceId?.exact : '';
        const micId = typeof config.audio === 'object' ? config.audio.deviceId?.exact : '';
        if (cameraId === 'broken-camera' || (cameraId === 'test-rear' && state.failCamera)) throw new DOMException('Camera unavailable', 'NotReadableError');
        if (cameraId === 'test-rear') delete config.video.deviceId;
        if (micId === 'test-mic') delete config.audio.deviceId;
        const stream = await gum(config);
        for (const track of stream.getTracks()) {
          state.tracks.push(track);
          if ((track.kind === 'video' && cameraId === 'test-rear') || (track.kind === 'audio' && micId === 'test-mic')) {
            const settings = track.getSettings.bind(track); track.getSettings = () => ({ ...settings(), deviceId: track.kind === 'video' ? 'test-rear' : 'test-mic' });
          }
        }
        return stream;
      };
      const nativeSink = HTMLMediaElement.prototype.setSinkId;
      if (support) {
        HTMLMediaElement.prototype.setSinkId = async function(id) { state.sinkChanges.push(id); if (nativeSink) await nativeSink.call(this, id === 'test-speaker' ? '' : id); };
        media.selectAudioOutput = async () => { state.prompts++; return { deviceId: 'test-speaker', kind: 'audiooutput', label: 'Loudspeaker (test)' }; };
      } else { HTMLMediaElement.prototype.setSinkId = undefined; media.selectAudioOutput = undefined; }
    }, { token: token(id), match: ids.match, other: { id: other, name: `${prefix} ${other === ids.a ? 'A' : 'B'}` }, support });
    const page = await context.newPage(); page.setDefaultTimeout(60000); pages.push(page);
    await page.goto(`http://localhost:3009/${routeName}`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.getByText('Ready for call', { exact: true }).waitFor();
  }
  const [a, b] = pages; currentPage = a;
  const connected = async page => page.waitForFunction(() => window.__callTest.peers.some(peer => peer.connectionState === 'connected'), { timeout: 30000 });
  for (const type of ['audio','video']) {
    await a.getByRole('button', { name: `Start ${type}`, exact: true }).click();
    await b.getByRole('button', { name: 'Accept', exact: true }).click();
    await connected(a); await connected(b);
    await a.getByRole('button', { name: 'Mute microphone', exact: true }).click();
    assert.equal(await a.evaluate(() => window.__callTest.peers.at(-1).getSenders().find(sender => sender.track.kind === 'audio').track.enabled), false);
    assert.equal(await a.getByRole('button', { name: 'Speaker / audio output', exact: true }).count(), 0);
    assert.equal(await b.getByRole('button', { name: 'Speaker / audio output', exact: true }).count(), 0);
    await a.getByRole('button', { name: 'Unmute microphone', exact: true }).click();
    await b.getByRole('button', { name: 'Mute call audio', exact: true }).click();
    assert.equal(await b.locator('audio').evaluate(element => element.muted), true);
    await b.getByRole('button', { name: 'Unmute call audio', exact: true }).click();
    if (type === 'video') {
      await a.getByRole('button', { name: 'Switch front / back camera', exact: true }).click();
      await a.waitForFunction(() => window.__callTest.peers.at(-1).getSenders().find(sender => sender.track.kind === 'video').track.getSettings().deviceId === 'test-rear');
      // The next virtual camera is unavailable; the prior camera should recover.
      await a.getByRole('button', { name: 'Switch front / back camera', exact: true }).click();
      await a.getByRole('alert').waitFor();
      assert.equal(await a.evaluate(() => window.__callTest.peers.at(-1).getSenders().find(sender => sender.track.kind === 'video').track.readyState), 'live');
      await a.getByRole('button', { name: 'Turn camera off', exact: true }).click();
      assert.equal(await a.evaluate(() => window.__callTest.peers.at(-1).getSenders().find(sender => sender.track.kind === 'video').track.enabled), false);
      await a.getByRole('button', { name: 'Turn camera on', exact: true }).click();
      await b.screenshot({ path: path.join(os.tmpdir(), 'connectlove-mobile-call-controls.png') });
    }
    assert.equal(await b.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await a.getByRole('button', { name: 'End call', exact: true }).click();
    await waitFor(() => a.getByRole('toolbar', { name: 'Call controls' }).count().then(count => count === 0), 'Caller overlay did not close');
    await waitFor(() => b.getByRole('toolbar', { name: 'Call controls' }).count().then(count => count === 0), 'Receiver overlay did not close');
    for (const page of [a,b]) assert.equal(await page.evaluate(() => window.__callTest.tracks.every(track => track.readyState === 'ended')), true, 'Release all acquired tracks after hangup');
    console.log(`PASS: real two-peer ${type} call; mic/sound mute, removed Speaker button, camera controls, hangup and media cleanup`);
  }
  await a.getByRole('button', { name: 'Start audio', exact: true }).click();
  await b.getByRole('button', { name: 'Accept', exact: true }).click();
  await connected(a);
  await a.evaluate(() => document.getElementById('leave-provider').click());
  await a.getByText('Provider closed', { exact: true }).waitFor();
  assert.equal(await a.evaluate(() => window.__callTest.tracks.every(track => track.readyState === 'ended')), true);
  await waitFor(() => b.getByRole('toolbar', { name: 'Call controls' }).count().then(count => count === 0), 'Leaving the provider did not end the remote call');
  console.log('PASS: leaving the call provider releases media and ends the other peer call');
}
run().catch(async error => {
  console.error(error.message); process.exitCode = 1;
  if (currentPage) { console.error('Test page:', currentPage.url()); await currentPage.screenshot({ path: path.join(os.tmpdir(), 'connectlove-call-controls-debug.png') }).catch(() => {}); }
}).finally(async () => {
  if (browser) await browser.close();
  if (db) {
    await db.execute('DELETE FROM audit_logs WHERE userId IN (?,?,?)', [ids.a, ids.b, ids.admin]);
    await db.execute('DELETE FROM users WHERE id IN (?,?,?)', [ids.a, ids.b, ids.admin]);
    await db.execute('DELETE FROM agents WHERE id=?', [ids.agent]); await db.end();
  }
  // The route is a single generated file under the verified test-only directory.
  await fs.unlink(path.join(route, 'page.tsx')).catch(() => {}); await fs.rmdir(route).catch(() => {});
});
