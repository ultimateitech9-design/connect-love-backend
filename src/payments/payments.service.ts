import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { request as httpsRequest } from 'https';
import { Repository } from 'typeorm';
import { Payment } from '../platform/payment.entity';
import { User, UserPlan } from '../users/user.entity';
import { isWoman } from '../plans/plan-entitlements';
import { Coupon } from './coupon.entity';

const PAID_PLANS: Record<string, { name: string; userPlan: UserPlan; amountPaise: number }> = {
  premium: { name: 'Gold', userPlan: 'gold', amountPaise: 29900 },
  elite: { name: 'Diamond', userPlan: 'platinum', amountPaise: 49900 },
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
  ) {}

  private async discountFor(rawCode: string | undefined, userPlan: UserPlan, amountPaise: number) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { coupon: null as Coupon | null, discountPaise: 0, finalPaise: amountPaise };
    const coupon = await this.couponRepo.findOne({ where: { code } });
    if (!coupon || !coupon.active) throw new BadRequestException('Invalid or inactive coupon code.');
    if (coupon.expiresAt && coupon.expiresAt <= new Date()) throw new BadRequestException('This coupon has expired.');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('This coupon usage limit has been reached.');
    if (coupon.applicablePlan !== 'all' && coupon.applicablePlan !== userPlan) throw new BadRequestException(`This coupon is not valid for the ${userPlan === 'gold' ? 'Gold' : 'Diamond'} plan.`);
    const discountPaise = Math.floor((amountPaise * coupon.discountPercent) / 100);
    return { coupon, discountPaise, finalPaise: Math.max(100, amountPaise - discountPaise) };
  }

  async validateCoupon(userId: string, requestedPlan: string, couponCode: string) {
    const plan = PAID_PLANS[requestedPlan];
    if (!plan) throw new BadRequestException('Invalid paid plan.');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User account not found.');
    if (isWoman(user)) throw new BadRequestException('All features are already free for women. No plan purchase is required.');
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
    if (isWoman(user)) throw new BadRequestException('All features are already free for women. No plan purchase is required.');
    const discount = await this.discountFor(couponCode, plan.userPlan, plan.amountPaise);

    const payment = await this.paymentRepo.save(this.paymentRepo.create({
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
      gatewayPayment = await this.razorpay(`/payments/${paymentId}/capture`, {
        method: 'POST',
        body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
      });
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

  private async activatePlan(payment: Payment, gatewayPaymentId: string) {
    if (payment.status === 'successful') return { success: true, plan: payment.planName };
    const user = await this.userRepo.findOne({ where: { id: payment.userId } });
    if (!user) throw new BadRequestException('Payment user no longer exists.');
    const base = user.planExpiresAt && user.planExpiresAt > new Date() ? user.planExpiresAt : new Date();
    const expiresAt = new Date(base);
    expiresAt.setDate(expiresAt.getDate() + 30);
    user.plan = payment.planName as UserPlan;
    user.planExpiresAt = expiresAt;
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.status = 'successful';
    await this.userRepo.save(user);
    await this.paymentRepo.save(payment);
    if (payment.couponCode) await this.couponRepo.increment({ code: payment.couponCode }, 'usedCount', 1);
    return { success: true, plan: user.plan, expiresAt };
  }

  private safeEqual(left: string, right: string) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
