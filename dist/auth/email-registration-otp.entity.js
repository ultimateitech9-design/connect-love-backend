"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmailRegistrationOtp", {
    enumerable: true,
    get: function() {
        return EmailRegistrationOtp;
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
let EmailRegistrationOtp = class EmailRegistrationOtp {
};
_ts_decorate([
    (0, _typeorm.PrimaryColumn)({
        length: 255
    }),
    _ts_metadata("design:type", String)
], EmailRegistrationOtp.prototype, "email", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 64
    }),
    _ts_metadata("design:type", String)
], EmailRegistrationOtp.prototype, "otpHash", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'datetime',
        precision: 6
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], EmailRegistrationOtp.prototype, "expiresAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        unsigned: true,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], EmailRegistrationOtp.prototype, "attempts", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'datetime',
        precision: 6
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], EmailRegistrationOtp.prototype, "lastSentAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'datetime',
        precision: 6
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], EmailRegistrationOtp.prototype, "sendWindowStartedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        unsigned: true,
        default: 1
    }),
    _ts_metadata("design:type", Number)
], EmailRegistrationOtp.prototype, "sendCount", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], EmailRegistrationOtp.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], EmailRegistrationOtp.prototype, "updatedAt", void 0);
EmailRegistrationOtp = _ts_decorate([
    (0, _typeorm.Entity)('email_registration_otps')
], EmailRegistrationOtp);

//# sourceMappingURL=email-registration-otp.entity.js.map