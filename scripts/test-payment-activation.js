// Run after npm run build. No database or payment-provider requests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PaymentsService } = require('../dist/payments/payments.service');
const { Payment } = require('../dist/platform/payment.entity');
const { User } = require('../dist/users/user.entity');
const { Coupon } = require('../dist/payments/coupon.entity');
const { createHmac } = require('node:crypto');

function fixture() {
  const payment = { id: 'payment-1', userId: 'user-1', gatewayOrderId: 'order-1', planName: 'gold', status: 'pending', amount: '299.00', couponCode: 'ONCE', currency: 'INR' };
  const user = { id: 'user-1', plan: 'free', planExpiresAt: null };
  const coupon = { code: 'ONCE', active: true, maxUses: 1, usedCount: 0, discountPercent: 20, applicablePlan: 'all' };
  const events = [];
  let committed = false;
  let tail = Promise.resolve();
  const couponRepo = { findOne: async () => coupon, save: async value => value };
  const manager = {
    findOne: async entity => entity === Payment ? payment : entity === User ? user : entity === Coupon ? coupon : null,
    save: async value => value,
    getRepository: entity => entity === Coupon ? couponRepo : { count: async () => payment.status === 'pending' ? 1 : 0 },
    transaction: work => {
      const result = tail.then(async () => { committed = false; const result = await work(manager); committed = true; return result; });
      tail = result.catch(() => {}); return result;
    },
  };
  const repo = { manager, findOne: async () => payment, count: async () => payment.status === 'pending' ? 1 : 0 };
  const service = new PaymentsService(repo, {}, couponRepo, {}, { changed: (...args) => { assert(committed); events.push(args); } });
  service.credentials = () => ({ keySecret: 'test-only-secret' });
  return { service, payment, user, coupon, events };
}

test('concurrent callback/webhook activates once, consumes coupon once, emits after commit', async () => {
  const f = fixture();
  await Promise.all([f.service.activatePlan(f.payment, 'pay-1'), f.service.activatePlan(f.payment, 'pay-1')]);
  assert.equal(f.payment.status, 'successful');
  assert.equal(f.user.plan, 'gold');
  assert.equal(f.coupon.usedCount, 1);
  assert.equal(f.coupon.active, false);
  assert(Math.abs((f.user.planExpiresAt.getTime() - Date.now()) / 86400000 - 30) < 0.001);
  await assert.rejects(() => f.service.discountFor('ONCE', 'gold', 29900));
});
test('a pending checkout reserves the last coupon use', async () => {
  const f = fixture();
  await assert.rejects(() => f.service.discountFor('ONCE', 'gold', 29900), /reserved/);
});
test('usage limit five permits five purchases, then disables the coupon and rejects the sixth', async () => {
  const f = fixture();
  f.coupon.maxUses = 5;
  for (let use = 1; use <= 5; use++) {
    // Validate before reserving a fresh checkout, then confirm its payment.
    f.payment.status = 'failed';
    await f.service.discountFor('ONCE', 'gold', 29900);
    f.payment.id = 'payment-' + use;
    f.payment.status = 'pending';
    await f.service.activatePlan(f.payment, 'pay-' + use);
    assert.equal(f.coupon.usedCount, use);
    assert.equal(f.coupon.active, use < 5);
    // A repeated callback must not consume another use.
    await f.service.activatePlan(f.payment, 'pay-' + use);
    assert.equal(f.coupon.usedCount, use);
  }
  await assert.rejects(() => f.service.discountFor('ONCE', 'gold', 29900));
});
test('refunded payment cannot reactivate membership', async () => {
  const f = fixture(); f.payment.status = 'refunded';
  await assert.rejects(() => f.service.activatePlan(f.payment, 'pay-1'), /refunded/);
  assert.equal(f.user.plan, 'free');
});
test('invalid signature and mismatched gateway amount cannot activate membership', async () => {
  const f = fixture();
  const body = { razorpay_order_id: 'order-1', razorpay_payment_id: 'pay-1', razorpay_signature: 'invalid' };
  await assert.rejects(() => f.service.verifyPayment('user-1', body), /signature/);
  body.razorpay_signature = createHmac('sha256', 'test-only-secret').update('order-1|pay-1').digest('hex');
  f.service.razorpay = async () => ({ order_id: 'order-1', amount: 100, currency: 'INR', status: 'captured' });
  await assert.rejects(() => f.service.verifyPayment('user-1', body), /do not match/);
  assert.equal(f.payment.status, 'pending');
});
test('capture race recovers by checking the gateway captured status', async () => {
  const f = fixture();
  let calls = 0;
  f.service.razorpay = async () => {
    calls++;
    if (calls === 2) throw Error('Captured by webhook already');
    return { order_id: 'order-1', amount: 29900, currency: 'INR', status: calls === 1 ? 'authorized' : 'captured' };
  };
  const result = await f.service.verifyPayment('user-1', {
    razorpay_order_id: 'order-1', razorpay_payment_id: 'pay-1',
    razorpay_signature: createHmac('sha256', 'test-only-secret').update('order-1|pay-1').digest('hex'),
  });
  assert.equal(result.success, true);
  assert.equal(f.payment.status, 'successful');
});
