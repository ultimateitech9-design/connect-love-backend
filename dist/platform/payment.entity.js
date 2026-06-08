"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Payment", {
    enumerable: true,
    get: function() {
        return Payment;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("../users/user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let Payment = class Payment {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], Payment.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Payment.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true,
        onDelete: 'SET NULL'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Payment.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 120
    }),
    _ts_metadata("design:type", String)
], Payment.prototype, "planName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2
    }),
    _ts_metadata("design:type", String)
], Payment.prototype, "amount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 10,
        default: 'USD'
    }),
    _ts_metadata("design:type", String)
], Payment.prototype, "currency", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'successful',
            'pending',
            'refunded',
            'failed'
        ],
        default: 'pending'
    }),
    _ts_metadata("design:type", typeof PaymentStatus === "undefined" ? Object : PaymentStatus)
], Payment.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Payment.prototype, "createdAt", void 0);
Payment = _ts_decorate([
    (0, _typeorm.Entity)('payments')
], Payment);

//# sourceMappingURL=payment.entity.js.map