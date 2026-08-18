"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PaymentsService", {
    enumerable: true,
    get: function() {
        return PaymentsService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _crypto = require("crypto");
const _https = require("https");
const _typeorm1 = require("typeorm");
const _paymententity = require("../platform/payment.entity");
const _userentity = require("../users/user.entity");
const _planentitlements = require("../plans/plan-entitlements");
const _couponentity = require("./coupon.entity");
const _boostentity = require("../boosts/boost.entity");
const _boostsservice = require("../boosts/boosts.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
const PAID_PLANS = {
    premium: {
        name: 'Gold',
        userPlan: 'gold',
        amountPaise: 29900
    },
    elite: {
        name: 'Diamond',
        userPlan: 'platinum',
        amountPaise: 49900
    }
};
let PaymentsService = class PaymentsService {
    async discountFor(rawCode, userPlan, amountPaise) {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) return {
            coupon: null,
            discountPaise: 0,
            finalPaise: amountPaise
        };
        const coupon = await this.couponRepo.findOne({
            where: {
                code
            }
        });
        if (!coupon || !coupon.active) throw new _common.BadRequestException('Invalid or inactive coupon code.');
        if (coupon.expiresAt && coupon.expiresAt <= new Date()) throw new _common.BadRequestException('This coupon has expired.');
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new _common.BadRequestException('This coupon usage limit has been reached.');
        if (coupon.applicablePlan !== 'all' && coupon.applicablePlan !== userPlan) throw new _common.BadRequestException(`This coupon is not valid for the ${userPlan === 'gold' ? 'Gold' : 'Diamond'} plan.`);
        const discountPaise = Math.floor(amountPaise * coupon.discountPercent / 100);
        return {
            coupon,
            discountPaise,
            finalPaise: Math.max(100, amountPaise - discountPaise)
        };
    }
    async createBoostOrder(userId, requestedPlan) {
        const planKey = requestedPlan;
        const plan = _boostsservice.BOOST_PLANS[planKey];
        if (!plan) throw new _common.BadRequestException('Invalid boost plan.');
        const user = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        if (!user) throw new _common.UnauthorizedException('User account not found.');
        const payment = await this.paymentRepo.save(this.paymentRepo.create({
            userId,
            planName: `boost:${planKey}`,
            amount: plan.price.toFixed(2),
            originalAmount: plan.price.toFixed(2),
            discountAmount: '0.00',
            couponCode: null,
            currency: 'INR',
            status: 'pending',
            gateway: 'razorpay'
        }));
        try {
            const order = await this.razorpay('/orders', {
                method: 'POST',
                body: JSON.stringify({
                    amount: plan.price * 100,
                    currency: 'INR',
                    receipt: payment.id,
                    notes: {
                        paymentId: payment.id,
                        userId,
                        product: 'profile_boost',
                        boostPlan: planKey
                    }
                })
            });
            payment.gatewayOrderId = order.id;
            await this.paymentRepo.save(payment);
            return {
                keyId: this.credentials().keyId,
                orderId: order.id,
                amount: plan.price * 100,
                currency: 'INR',
                planName: plan.name,
                customer: {
                    name: user.name,
                    email: user.email
                }
            };
        } catch (error) {
            payment.status = 'failed';
            await this.paymentRepo.save(payment);
            throw error;
        }
    }
    async validateCoupon(userId, requestedPlan, couponCode) {
        const plan = PAID_PLANS[requestedPlan];
        if (!plan) throw new _common.BadRequestException('Invalid paid plan.');
        const user = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        if (!user) throw new _common.UnauthorizedException('User account not found.');
        if ((0, _planentitlements.isWoman)(user)) throw new _common.BadRequestException('All features are already free for women. No plan purchase is required.');
        const discount = await this.discountFor(couponCode, plan.userPlan, plan.amountPaise);
        return {
            code: discount.coupon?.code,
            discountPercent: discount.coupon?.discountPercent,
            originalAmount: plan.amountPaise / 100,
            discountAmount: discount.discountPaise / 100,
            finalAmount: discount.finalPaise / 100,
            currency: 'INR'
        };
    }
    credentials() {
        const keyId = process.env.RAZORPAY_KEY_ID?.trim();
        const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
        if (!keyId || !keySecret || keyId.includes('replace_me')) {
            throw new _common.ServiceUnavailableException('Razorpay keys are not configured on the server.');
        }
        return {
            keyId,
            keySecret
        };
    }
    async razorpay(path, init = {}) {
        const { keyId, keySecret } = this.credentials();
        const body = init.body;
        return new Promise((resolve, reject)=>{
            const request = (0, _https.request)({
                hostname: 'api.razorpay.com',
                port: 443,
                path: `/v1${path}`,
                method: init.method || 'GET',
                family: 4,
                headers: {
                    Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
                    'Content-Type': 'application/json',
                    ...body ? {
                        'Content-Length': Buffer.byteLength(body)
                    } : {}
                }
            }, (response)=>{
                const chunks = [];
                response.on('data', (chunk)=>chunks.push(chunk));
                response.on('end', ()=>{
                    const raw = Buffer.concat(chunks).toString('utf8');
                    let data = {};
                    try {
                        data = raw ? JSON.parse(raw) : {};
                    } catch  {
                        data = {};
                    }
                    const statusCode = response.statusCode || 500;
                    if (statusCode < 200 || statusCode >= 300) {
                        reject(new _common.BadGatewayException(data?.error?.description || `Razorpay request failed (${statusCode}).`));
                        return;
                    }
                    resolve(data);
                });
            });
            request.setTimeout(15000, ()=>request.destroy(new Error('Razorpay request timed out')));
            request.on('error', ()=>reject(new _common.BadGatewayException('Could not connect to Razorpay. Check the server internet connection and try again.')));
            if (body) request.write(body);
            request.end();
        });
    }
    async createOrder(userId, requestedPlan, couponCode) {
        const plan = PAID_PLANS[requestedPlan];
        if (!plan) throw new _common.BadRequestException('Invalid paid plan.');
        const user = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        if (!user) throw new _common.UnauthorizedException('User account not found.');
        if ((0, _planentitlements.isWoman)(user)) throw new _common.BadRequestException('All features are already free for women. No plan purchase is required.');
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
            gateway: 'razorpay'
        }));
        try {
            const order = await this.razorpay('/orders', {
                method: 'POST',
                body: JSON.stringify({
                    amount: discount.finalPaise,
                    currency: 'INR',
                    receipt: payment.id,
                    notes: {
                        paymentId: payment.id,
                        userId,
                        plan: plan.userPlan,
                        coupon: discount.coupon?.code || ''
                    }
                })
            });
            payment.gatewayOrderId = order.id;
            await this.paymentRepo.save(payment);
            return {
                keyId: this.credentials().keyId,
                orderId: order.id,
                amount: discount.finalPaise,
                currency: 'INR',
                planName: plan.name,
                coupon: discount.coupon ? {
                    code: discount.coupon.code,
                    discountPercent: discount.coupon.discountPercent
                } : null,
                customer: {
                    name: user.name,
                    email: user.email
                }
            };
        } catch (error) {
            payment.status = 'failed';
            await this.paymentRepo.save(payment);
            throw error;
        }
    }
    async verifyPayment(userId, body) {
        const orderId = body.razorpay_order_id || '';
        const paymentId = body.razorpay_payment_id || '';
        const signature = body.razorpay_signature || '';
        if (!orderId || !paymentId || !signature) throw new _common.BadRequestException('Incomplete Razorpay response.');
        const payment = await this.paymentRepo.findOne({
            where: {
                gatewayOrderId: orderId,
                userId
            }
        });
        if (!payment) throw new _common.BadRequestException('Payment order was not found.');
        const expected = (0, _crypto.createHmac)('sha256', this.credentials().keySecret).update(`${orderId}|${paymentId}`).digest('hex');
        if (!this.safeEqual(expected, signature)) throw new _common.UnauthorizedException('Invalid payment signature.');
        let gatewayPayment = await this.razorpay(`/payments/${paymentId}`);
        const amountPaise = Math.round(Number(payment.amount) * 100);
        if (gatewayPayment.order_id !== orderId || gatewayPayment.amount !== amountPaise || gatewayPayment.currency !== 'INR') {
            throw new _common.BadRequestException('Payment details do not match this order.');
        }
        if (gatewayPayment.status === 'authorized') {
            gatewayPayment = await this.razorpay(`/payments/${paymentId}/capture`, {
                method: 'POST',
                body: JSON.stringify({
                    amount: amountPaise,
                    currency: 'INR'
                })
            });
        }
        if (gatewayPayment.status !== 'captured') throw new _common.BadRequestException('Payment has not been captured yet.');
        return this.activatePlan(payment, paymentId);
    }
    async handleWebhook(rawBody, body, signature) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
        if (!secret || !rawBody || !signature) throw new _common.UnauthorizedException('Webhook verification is not configured.');
        const expected = (0, _crypto.createHmac)('sha256', secret).update(rawBody).digest('hex');
        if (!this.safeEqual(expected, signature)) throw new _common.UnauthorizedException('Invalid webhook signature.');
        if (body?.event === 'payment.captured' || body?.event === 'order.paid') {
            const gatewayPayment = body?.payload?.payment?.entity;
            const orderId = gatewayPayment?.order_id || body?.payload?.order?.entity?.id;
            const paymentId = gatewayPayment?.id;
            if (orderId && paymentId) {
                const payment = await this.paymentRepo.findOne({
                    where: {
                        gatewayOrderId: orderId
                    }
                });
                const expectedAmount = payment ? Math.round(Number(payment.amount) * 100) : 0;
                if (payment && gatewayPayment?.status === 'captured' && gatewayPayment?.amount === expectedAmount && gatewayPayment?.currency === payment.currency) {
                    await this.activatePlan(payment, paymentId);
                }
            }
        }
        return {
            received: true
        };
    }
    async activatePlan(payment, gatewayPaymentId) {
        if (payment.status === 'successful') {
            if (payment.planName.startsWith('boost:')) {
                const boost = await this.boostRepo.findOne({
                    where: {
                        userId: payment.userId,
                        requestId: payment.id
                    }
                });
                return {
                    success: true,
                    product: 'profile_boost',
                    plan: payment.planName.slice('boost:'.length),
                    startsAt: boost?.startsAt,
                    endsAt: boost?.endsAt
                };
            }
            return {
                success: true,
                plan: payment.planName
            };
        }
        const user = await this.userRepo.findOne({
            where: {
                id: payment.userId
            }
        });
        if (!user) throw new _common.BadRequestException('Payment user no longer exists.');
        if (payment.planName.startsWith('boost:')) {
            const planKey = payment.planName.slice('boost:'.length);
            const plan = _boostsservice.BOOST_PLANS[planKey];
            if (!plan) throw new _common.BadRequestException('Boost plan no longer exists.');
            let boost = await this.boostRepo.findOne({
                where: {
                    userId: payment.userId,
                    requestId: payment.id
                }
            });
            if (!boost) {
                const latest = await this.boostRepo.findOne({
                    where: {
                        userId: payment.userId
                    },
                    order: {
                        endsAt: 'DESC'
                    }
                });
                const now = new Date();
                const startsAt = latest?.endsAt && latest.endsAt > now ? latest.endsAt : now;
                boost = await this.boostRepo.save(this.boostRepo.create({
                    userId: payment.userId,
                    requestId: payment.id,
                    planKey,
                    amount: plan.price,
                    currency: 'INR',
                    startsAt,
                    endsAt: new Date(startsAt.getTime() + plan.durationMinutes * 60_000)
                }));
            }
            payment.gatewayPaymentId = gatewayPaymentId;
            payment.status = 'successful';
            await this.paymentRepo.save(payment);
            return {
                success: true,
                product: 'profile_boost',
                plan: planKey,
                startsAt: boost.startsAt,
                endsAt: boost.endsAt
            };
        }
        const base = user.planExpiresAt && user.planExpiresAt > new Date() ? user.planExpiresAt : new Date();
        const expiresAt = new Date(base);
        expiresAt.setDate(expiresAt.getDate() + 30);
        user.plan = payment.planName;
        user.planExpiresAt = expiresAt;
        payment.gatewayPaymentId = gatewayPaymentId;
        payment.status = 'successful';
        await this.userRepo.save(user);
        await this.paymentRepo.save(payment);
        if (payment.couponCode) await this.couponRepo.increment({
            code: payment.couponCode
        }, 'usedCount', 1);
        return {
            success: true,
            plan: user.plan,
            expiresAt
        };
    }
    safeEqual(left, right) {
        const a = Buffer.from(left);
        const b = Buffer.from(right);
        return a.length === b.length && (0, _crypto.timingSafeEqual)(a, b);
    }
    constructor(paymentRepo, userRepo, couponRepo, boostRepo){
        this.paymentRepo = paymentRepo;
        this.userRepo = userRepo;
        this.couponRepo = couponRepo;
        this.boostRepo = boostRepo;
    }
};
PaymentsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_paymententity.Payment)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_couponentity.Coupon)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_boostentity.ProfileBoost)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], PaymentsService);

//# sourceMappingURL=payments.service.js.map