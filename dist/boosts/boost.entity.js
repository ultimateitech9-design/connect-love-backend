"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProfileBoost", {
    enumerable: true,
    get: function() {
        return ProfileBoost;
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
let ProfileBoost = class ProfileBoost {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], ProfileBoost.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 36
    }),
    _ts_metadata("design:type", String)
], ProfileBoost.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 36
    }),
    _ts_metadata("design:type", String)
], ProfileBoost.prototype, "requestId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 30
    }),
    _ts_metadata("design:type", typeof BoostPlanKey === "undefined" ? Object : BoostPlanKey)
], ProfileBoost.prototype, "planKey", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], ProfileBoost.prototype, "amount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 3,
        default: 'INR'
    }),
    _ts_metadata("design:type", String)
], ProfileBoost.prototype, "currency", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'datetime'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ProfileBoost.prototype, "startsAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'datetime'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ProfileBoost.prototype, "endsAt", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ProfileBoost.prototype, "createdAt", void 0);
ProfileBoost = _ts_decorate([
    (0, _typeorm.Entity)('profile_boosts'),
    (0, _typeorm.Index)('IDX_profile_boosts_user_ends', [
        'userId',
        'endsAt'
    ]),
    (0, _typeorm.Index)('UQ_profile_boosts_user_request', [
        'userId',
        'requestId'
    ], {
        unique: true
    })
], ProfileBoost);

//# sourceMappingURL=boost.entity.js.map