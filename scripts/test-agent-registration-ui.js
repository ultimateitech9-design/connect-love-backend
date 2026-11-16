// Local UI checks with intercepted email/auth requests. No real email is sent.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let browser, page;
async function run() {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage(); page.setDefaultTimeout(30000);
  const errors = [], payloads = [];
  let codeRequests = 0;
  page.on('pageerror', err => errors.push(err.message));
  const agent = { id: 'ui-test-agent', name: 'Agent Example', email: 'agent@example.invalid' };
  await page.route('**/agents/**', async route => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON();
    if (url.pathname.endsWith('/auth/signup-otp')) { codeRequests++; assert.deepEqual(Object.keys(body), ['email']); return route.fulfill({ json: { message: 'Verification code sent.' } }); }
    if (url.pathname.endsWith('/auth/register')) {
      payloads.push(body);
      if (body.otp !== '123456') return route.fulfill({ status: 401, json: { message: 'The code is incorrect.' } });
      return route.fulfill({ json: { agent, token: 'ui-test-agent-session' } });
    }
    if (url.pathname.endsWith('/me')) return route.fulfill({ json: { agent } });
    if (url.pathname.endsWith('/users')) return route.fulfill({ json: { users: [], total: 0, totalAccounts: 0, activeAccounts: 0, pages: 1, page: 1 } });
    return route.fulfill({ json: { message: 'Password reset successfully. Please sign in with your new password.' } });
  });
  await page.goto('http://localhost:3002/agent/register', { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByLabel('Full name', { exact: true }).fill('Agent Example');
  await page.getByLabel('Email address', { exact: true }).fill('agent@example.invalid');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('Strong-Password-123');
  assert.equal(await password.getAttribute('type'), 'password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await password.getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  assert.equal(await password.getAttribute('type'), 'password');
  assert.equal(await page.locator('input[name=otp]').count(), 0);
  await page.screenshot({ path: path.join(os.tmpdir(), 'connectlove-agent-signup-step1.png') });
  await page.getByRole('button', { name: 'Continue to verification', exact: true }).click();
  await page.waitForURL('**/agent/register/verify');
  await page.getByLabel('Verification code', { exact: true }).waitFor();
  assert.equal(codeRequests, 1);
  assert.equal(await page.locator('input[name=name],input[name=email],input[name=password]').count(), 0);
  assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes('Strong-Password-123')), false);
  assert.equal(page.url().includes('Strong-Password-123'), false);
  assert.equal(await page.getByRole('button', { name: /Resend code in/ }).isDisabled(), true);
  await page.getByRole('link', { name: 'Edit name, email or password' }).click();
  await page.waitForURL('**/agent/register');
  assert.equal(await password.inputValue(), 'Strong-Password-123');
  await page.getByLabel('Full name', { exact: true }).fill('Updated Agent');
  await password.fill('Updated-Password-456');
  await page.getByRole('button', { name: 'Continue to verification', exact: true }).click();
  await page.waitForURL('**/agent/register/verify');
  assert.equal(codeRequests, 1, 'Editing details should reuse the issued code for the same email');
  await page.getByLabel('Verification code', { exact: true }).fill('000000');
  await page.getByRole('button', { name: 'Verify & create account', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'The code is incorrect.' }).waitFor();
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(os.tmpdir(), 'connectlove-agent-signup-step2-mobile.png') });
  await page.getByRole('button', { name: 'Verify & create account', exact: true }).click();
  await page.waitForURL('**/agent/dashboard');
  assert.deepEqual(payloads.at(-1), { name: 'Updated Agent', email: 'agent@example.invalid', password: 'Updated-Password-456', otp: '123456' });
  await page.goto('http://localhost:3002/agent/register/verify', { waitUntil: 'networkidle' });
  await page.waitForURL('**/agent/register?reason=restart');
  assert.equal(await password.inputValue(), '');
  await page.getByText('Please enter your details again', { exact: false }).waitFor();
  await page.goto('http://localhost:3002/agent/forgot-password', { waitUntil: 'networkidle' });
  await page.getByLabel('Email address', { exact: true }).fill('agent@example.invalid');
  await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByLabel('New password', { exact: true }).fill('Another-Password-123');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.getByLabel('New password', { exact: true }).getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await page.getByText('Password reset successfully.', { exact: false }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: name/email/password first page, working eye toggle, separate OTP page, edit/back navigation, invalid OTP retry, preserved signup payload, no stored password, refresh restart, mobile layout and reset regression.');
}
run().catch(async err => {
  console.error(err.message); process.exitCode = 1;
  if (page) { console.error('Page:', page.url()); await page.screenshot({ path: path.join(os.tmpdir(), 'agent-registration-debug.png') }).catch(() => {}); }
}).finally(async () => { if (browser) await browser.close(); });
