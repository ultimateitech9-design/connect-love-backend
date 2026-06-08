"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SubscriptionPlan", {
    enumerable: true,
    get: function() {
        return SubscriptionPlan;
    }
});
const _typeorm = require("typeorm");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SubscriptionPlan = class SubscriptionPlan {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], SubscriptionPlan.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true,
        length: 120
    }),
    _ts_metadata("design:type", String)
], SubscriptionPlan.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 120
    }),
    _ts_metadata("design:type", String)
], SubscriptionPlan.prototype, "displayName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", String)
], SubscriptionPlan.prototype, "price", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 10,
        default: 'USD'
    }),
    _ts_metadata("design:type", String)
], SubscriptionPlan.prototype, "currency", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], SubscriptionPlan.prototype, "features", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'active',
            'inactive'
        ],
        default: 'active'
    }),
    _ts_metadata("design:type", typeof PlanStatus === "undefined" ? Object : PlanStatus)
], SubscriptionPlan.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 0
    }),
    _ts_metadata("design:type", Number)
], SubscriptionPlan.prototype, "sortOrder", void 0);
SubscriptionPlan = _ts_decorate([
    (0, _typeorm.Entity)('subscription_plans')
], SubscriptionPlan);

//# sourceMappingURL=subscription-plan.entity.js.map