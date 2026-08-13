"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PaymentsController", {
    enumerable: true,
    get: function() {
        return PaymentsController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _paymentsservice = require("./payments.service");
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
let PaymentsController = class PaymentsController {
    createOrder(request, plan, couponCode) {
        return this.paymentsService.createOrder(request.user.userId, plan, couponCode);
    }
    validateCoupon(request, plan, couponCode) {
        return this.paymentsService.validateCoupon(request.user.userId, plan, couponCode);
    }
    verifyPayment(request, body) {
        return this.paymentsService.verifyPayment(request.user.userId, body);
    }
    webhook(request, signature) {
        return this.paymentsService.handleWebhook(request.rawBody, request.body, signature);
    }
    constructor(paymentsService){
        this.paymentsService = paymentsService;
    }
};
_ts_decorate([
    (0, _common.Post)('order'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Body)('plan')),
    _ts_param(2, (0, _common.Body)('couponCode')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], PaymentsController.prototype, "createOrder", null);
_ts_decorate([
    (0, _common.Post)('coupon/validate'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Body)('plan')),
    _ts_param(2, (0, _common.Body)('couponCode')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], PaymentsController.prototype, "validateCoupon", null);
_ts_decorate([
    (0, _common.Post)('verify'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], PaymentsController.prototype, "verifyPayment", null);
_ts_decorate([
    (0, _common.Post)('webhook'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Headers)('x-razorpay-signature')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], PaymentsController.prototype, "webhook", null);
PaymentsController = _ts_decorate([
    (0, _common.Controller)('payments/razorpay'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _paymentsservice.PaymentsService === "undefined" ? Object : _paymentsservice.PaymentsService
    ])
], PaymentsController);

//# sourceMappingURL=payments.controller.js.map