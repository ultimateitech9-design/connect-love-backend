import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { request as httpsRequest } from 'https';
import { Repository, EntityManager } from 'typeorm';
import { BillingGateway } from './billing.gateway';
import { Payment } from '../platform/payment.entity';
import { User, UserPlan } from '../users/user.entity';
import { Coupon } from './coupon.entity';
import { ProfileBoost, type BoostPlanKey } from '../boosts/boost.entity';
import { BOOST_PLANS } from '../boosts/boosts.service';
import { entitlementsFor } from '../plans/plan-entitlements';

const PAID_PLANS: Record<string, { name: string; userPlan: UserPlan; amountPaise: number }> = {
  premium: { name: 'Gold', userPlan: 'gold', amountPaise: 29900 },
  elite: { name: 'Diamond', userPlan: 'platinum', amountPaise: 49900 },
};

@Injectable()
export class PaymentsService {
  private reconcileTimer?: ReturnType<typeof setInterval>;
  private reconciling = false;
  private checkedOrders = new Map<string, number>();
  onModuleInit() {
    this.reconcileTimer = setInterval(() => { void this.reconcileRecentPendingPayments().catch(() => undefined); }, 15000);
    this.reconcileTimer.unref();
  }
  onModuleDestroy() { if (this.reconcileTimer) clearInterval(this.reconcileTimer); }
  async membership(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'plan', 'planExpiresAt', 'isVerified', 'gender'] });
    if (!user) throw new UnauthorizedException('User account not found.');
    return { plan: user.plan, planExpiresAt: user.planExpiresAt, isVerified: user.isVerified, planBadge: entitlementsFor(user).verifiedBadge };
  }
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(ProfileBoost) private readonly boostRepo: Repository<ProfileBoost>,
    private readonly billing: BillingGateway,
  ) {}

  private async discountFor(rawCode: string | undefined, userPlan: UserPlan, amountPaise: number, manager?: EntityManager) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { coupon: null as Coupon | null, discountPaise: 0, finalPaise: amountPaise };
    const coupon = await (manager ? manager.getRepository(Coupon) : this.couponRepo).findOne({ where: { code }, ...(manager ? { lock: { mode: 'pessimistic_write' as const } } : {}) });
    if (!coupon || !coupon.active) throw new BadRequestException('Invalid or inactive coupon code.');
    if (coupon.expiresAt && coupon.expiresAt <= new Date()) throw new BadRequestException('This coupon has expired.');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('This coupon usage limit has been reached.');
    if (coupon.maxUses !== null) {
      const pending = await (manager ? manager.getRepository(Payment) : this.paymentRepo).count({ where: { couponCode: code, status: 'pending' } });
      if (coupon.usedCount + pending >= coupon.maxUses) throw new BadRequestException('This coupon is already used or reserved by a checkout.');
    }
    if (coupon.applicablePlan === 'coins') throw new BadRequestException('This coupon is only for wallet coin recharges.');
    if (coupon.applicablePlan !== 'all' && coupon.applicablePlan !== userPlan) throw new BadRequestException(`This coupon is not valid for the ${userPlan === 'gold' ? 'Gold' : 'Diamond'} plan.`);
    const discountPaise = Math.floor((amountPaise * coupon.discountPercent) / 100);
    return { coupon, discountPaise, finalPaise: Math.max(100, amountPaise - discountPaise) };
  }

  async createBoostOrder(userId: string, requestedPlan: string) {
    const planKey = requestedPlan as BoostPlanKey;
    const plan = BOOST_PLANS[planKey];
    if (!plan) throw new BadRequestException('Invalid boost plan.');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User account not found.');
    const payment = await this.paymentRepo.save(this.paymentRepo.create({ userId, planName: `boost:${planKey}`, amount: plan.price.toFixed(2), originalAmount: plan.price.toFixed(2), discountAmount: '0.00', couponCode: null, currency: 'INR', status: 'pending', gateway: 'razorpay' }));
    try {
      const order = await this.razorpay('/orders', { method: 'POST', body: JSON.stringify({ amount: plan.price * 100, currency: 'INR', receipt: payment.id, notes: { paymentId: payment.id, userId, product: 'profile_boost', boostPlan: planKey } }) });
      payment.gatewayOrderId = order.id; await this.paymentRepo.save(payment);
      return { keyId: this.credentials().keyId, orderId: order.id, amount: plan.price * 100, currency: 'INR', planName: plan.name, customer: { name: user.name, email: user.email } };
    } catch (error) { payment.status = 'failed'; await this.paymentRepo.save(payment); throw error; }
  }
  async validateCoupon(userId: string, requestedPlan: string, couponCode: string) {
    const plan = PAID_PLANS[requestedPlan];
    if (!plan) throw new BadRequestException('Invalid paid plan.');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User account not found.');
    const discount = await this.discountFor(couponCode, plan.userPlan, plan.amountPaise);
    return { code: discount.coupon?.code, discountPercent: discount.coupon?.discountPercent, originalAmount: plan.amountPaise / 100, discountAmount: discount.discountPaise / 100, finalAmount: discount.finalPaise / 100, currency: 'INR' };
  }

  private credentials() {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret || keyId.includes('replace_me')) {
      throw new ServiceUnavailableException('Razorpay keys are not configured on the server.');
    }
    return { keyId, keySecret };
  }

  private async razorpay(path: string, init: { method?: string; body?: string } = {}): Promise<any> {
    const { keyId, keySecret } = this.credentials();
    const body = init.body;
    return new Promise((resolve, reject) => {
      const request = httpsRequest({
        hostname: 'api.razorpay.com',
        port: 443,
        path: `/v1${path}`,
        method: init.method || 'GET',
        family: 4,
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      }, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data: any = {};
          try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
          const statusCode = response.statusCode || 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(new BadGatewayException(data?.error?.description || `Razorpay request failed (${statusCode}).`));
            return;
          }
          resolve(data);
        });
      });

      request.setTimeout(15000, () => request.destroy(new Error('Razorpay request timed out')));
      request.on('error', () => reject(new BadGatewayException(
        'Could not connect to Razorpay. Check the server internet connection and try again.',
      )));
      if (body) request.write(body);
      request.end();
    });
  }

  async createOrder(userId: string, requestedPlan: string, couponCode?: string) {
    const plan = PAID_PLANS[requestedPlan];
    if (!plan) throw new BadRequestException('Invalid paid plan.');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User account not found.');
    const { payment, discount } = await this.paymentRepo.manager.transaction(async manager => {
    const discount = await this.discountFor(couponCode, plan.userPlan, plan.amountPaise, manager);
    const payment = await manager.save(Payment, manager.create(Payment, {
      userId,
      planName: plan.userPlan,
      amount: (discount.finalPaise / 100).toFixed(2),
      originalAmount: (plan.amountPaise / 100).toFixed(2),
      discountAmount: (discount.discountPaise / 100).toFixed(2),
      couponCode: discount.coupon?.code || null,
      currency: 'INR',
      status: 'pending',
      gateway: 'razorpay',
    }));
    return { payment, discount };
    });

    try {
      const order = await this.razorpay('/orders', {
        method: 'POST',
        body: JSON.stringify({
          amount: discount.finalPaise,
          currency: 'INR',
          receipt: payment.id,
          notes: { paymentId: payment.id, userId, plan: plan.userPlan, coupon: discount.coupon?.code || '' },
        }),
      });
      payment.gatewayOrderId = order.id;
      await this.paymentRepo.save(payment);
      return {
        keyId: this.credentials().keyId,
        orderId: order.id,
        amount: discount.finalPaise,
        currency: 'INR',
        planName: plan.name,
        coupon: discount.coupon ? { code: discount.coupon.code, discountPercent: discount.coupon.discountPercent } : null,
        customer: { name: user.name, email: user.email },
      };
    } catch (error) {
      payment.status = 'failed';
      await this.paymentRepo.save(payment);
      throw error;
    }
  }

  async verifyPayment(userId: string, body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) {
    const orderId = body.razorpay_order_id || '';
    const paymentId = body.razorpay_payment_id || '';
    const signature = body.razorpay_signature || '';
    if (!orderId || !paymentId || !signature) throw new BadRequestException('Incomplete Razorpay response.');
    const payment = await this.paymentRepo.findOne({ where: { gatewayOrderId: orderId, userId } });
    if (!payment) throw new BadRequestException('Payment order was not found.');

    const expected = createHmac('sha256', this.credentials().keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    if (!this.safeEqual(expected, signature)) throw new UnauthorizedException('Invalid payment signature.');
    let gatewayPayment = await this.razorpay(`/payments/${paymentId}`);
    const amountPaise = Math.round(Number(payment.amount) * 100);
    if (gatewayPayment.order_id !== orderId || gatewayPayment.amount !== amountPaise || gatewayPayment.currency !== 'INR') {
      throw new BadRequestException('Payment details do not match this order.');
    }
    if (gatewayPayment.status === 'authorized') {
      try { gatewayPayment = await this.razorpay(`/payments/${paymentId}/capture`, {
        method: 'POST',
        body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
      }); } catch {
        // Automatic capture or a webhook may have won the capture race.
        gatewayPayment = await this.razorpay(`/payments/${paymentId}`);
      }
    }
    if (gatewayPayment.status !== 'captured') throw new BadRequestException('Payment has not been captured yet.');
    return this.activatePlan(payment, paymentId);
  }

  async handleWebhook(rawBody: Buffer | undefined, body: any, signature?: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (!secret || !rawBody || !signature) throw new UnauthorizedException('Webhook verification is not configured.');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!this.safeEqual(expected, signature)) throw new UnauthorizedException('Invalid webhook signature.');
    if (body?.event === 'payment.captured' || body?.event === 'order.paid') {
      const gatewayPayment = body?.payload?.payment?.entity;
      const orderId = gatewayPayment?.order_id || body?.payload?.order?.entity?.id;
      const paymentId = gatewayPayment?.id;
      if (orderId && paymentId) {
        const payment = await this.paymentRepo.findOne({ where: { gatewayOrderId: orderId } });
        const expectedAmount = payment ? Math.round(Number(payment.amount) * 100) : 0;
        if (
          payment
          && gatewayPayment?.status === 'captured'
          && gatewayPayment?.amount === expectedAmount
          && gatewayPayment?.currency === payment.currency
        ) {
          await this.activatePlan(payment, paymentId);
        }
      }
    }
    return { received: true };
  }

  /**
   * Repairs a recent checkout if its browser callback was interrupted. This is
   * deliberately limited to recent, pending orders; the gateway remains the
   * source of truth and a declined order is never activated.
   */
  async reconcileRecentPendingPayments() {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pending = await this.paymentRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    await Promise.all(pending
      .filter((payment) => payment.gatewayOrderId && payment.createdAt >= cutoff)
      .sort((a, b) => (this.checkedOrders.get(a.id) || 0) - (this.checkedOrders.get(b.id) || 0))
      .slice(0, 5)
      .map(async (payment) => {
        this.checkedOrders.set(payment.id, Date.now());
        try { await this.reconcilePendingPayment(payment); } catch { /* Retry on a later pass. */ }
      }));
    } finally { this.reconciling = false; }
  }

  private async reconcilePendingPayment(payment: Payment) {
    if (!payment.gatewayOrderId || payment.status !== 'pending') return;
    const response = await this.razorpay(`/orders/${encodeURIComponent(payment.gatewayOrderId)}/payments`);
    const expectedAmount = Math.round(Number(payment.amount) * 100);
    const captured = (response?.items || []).find((gatewayPayment: any) =>
      gatewayPayment?.status === 'captured'
      && gatewayPayment?.order_id === payment.gatewayOrderId
      && gatewayPayment?.amount === expectedAmount
      && gatewayPayment?.currency === payment.currency,
    );
    if (captured?.id) await this.activatePlan(payment, captured.id);
    else {
      const authorized = (response?.items || []).find((item: any) => item.status === 'authorized' && item.order_id === payment.gatewayOrderId && item.amount === expectedAmount && item.currency === payment.currency);
      if (authorized?.id) {
        const result = await this.razorpay('/payments/' + encodeURIComponent(authorized.id) + '/capture', { method: 'POST', body: JSON.stringify({ amount: expectedAmount, currency: payment.currency }) });
        if (result.status === 'captured') await this.activatePlan(payment, authorized.id);
      }
    }
  }

  private async activatePlan(requestedPayment: Payment, gatewayPaymentId: string) {
    const result = await this.paymentRepo.manager.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: requestedPayment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new BadRequestException('Payment was not found.');
      if (payment.status === 'refunded') throw new BadRequestException('This payment has already been refunded.');
    if (payment.status === 'successful') {
      if (payment.planName.startsWith('boost:')) {
        const boost = await manager.getRepository(ProfileBoost).findOne({ where: { userId: payment.userId, requestId: payment.id } });
        return { success: true, product: 'profile_boost', plan: payment.planName.slice('boost:'.length), startsAt: boost?.startsAt, endsAt: boost?.endsAt };
      }
      return { success: true, plan: payment.planName };
    }
    const user = await manager.findOne(User, { where: { id: payment.userId }, lock: { mode: 'pessimistic_write' } });
    if (!user) throw new BadRequestException('Payment user no longer exists.');
    if (payment.planName.startsWith('boost:')) {
      const planKey = payment.planName.slice('boost:'.length) as BoostPlanKey;
      const plan = BOOST_PLANS[planKey];
      if (!plan) throw new BadRequestException('Boost plan no longer exists.');
      const boosts = manager.getRepository(ProfileBoost);
      let boost = await boosts.findOne({ where: { userId: payment.userId, requestId: payment.id } });
      if (!boost) {
        const latest = await boosts.findOne({ where: { userId: payment.userId }, order: { endsAt: 'DESC' } });
        const now = new Date(); const startsAt = latest?.endsAt && latest.endsAt > now ? latest.endsAt : now;
        boost = await boosts.save(boosts.create({ userId: payment.userId, requestId: payment.id, planKey, amount: plan.price, currency: 'INR', startsAt, endsAt: new Date(startsAt.getTime() + plan.durationMinutes * 60_000) }));
      }
      payment.gatewayPaymentId = gatewayPaymentId; payment.status = 'successful'; await manager.save(payment);
      return { success: true, product: 'profile_boost', plan: planKey, startsAt: boost.startsAt, endsAt: boost.endsAt };
    }
    const base = user.planExpiresAt && user.planExpiresAt > new Date() ? user.planExpiresAt : new Date();
    const expiresAt = new Date(base);
    expiresAt.setDate(expiresAt.getDate() + 30);
    user.plan = payment.planName as UserPlan;
    user.planExpiresAt = expiresAt;
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.status = 'successful';
    await manager.save(user);
    await manager.save(payment);
    if (payment.couponCode) {
      const coupon = await manager.findOne(Coupon, { where: { code: payment.couponCode }, lock: { mode: 'pessimistic_write' } });
      if (coupon) {
        coupon.usedCount++;
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) coupon.active = false;
        await manager.save(coupon);
      }
    }
    return { success: true, plan: user.plan, expiresAt };
    });
    this.billing.changed(requestedPayment.userId, requestedPayment.id);
    return result;
  }

  private safeEqual(left: string, right: string) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
