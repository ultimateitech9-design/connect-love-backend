"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VerificationRequest", {
    enumerable: true,
    get: function() {
        return VerificationRequest;
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
let VerificationRequest = class VerificationRequest {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], VerificationRequest.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], VerificationRequest.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], VerificationRequest.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 80,
        default: 'Government ID'
    }),
    _ts_metadata("design:type", String)
], VerificationRequest.prototype, "idType", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'low',
            'normal',
            'high'
        ],
        default: 'normal'
    }),
    _ts_metadata("design:type", typeof VerificationPriority === "undefined" ? Object : VerificationPriority)
], VerificationRequest.prototype, "priority", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'pending',
            'under_review',
            'approved',
            'rejected'
        ],
        default: 'pending'
    }),
    _ts_metadata("design:type", typeof VerificationStatus === "undefined" ? Object : VerificationStatus)
], VerificationRequest.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], VerificationRequest.prototype, "documents", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], VerificationRequest.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], VerificationRequest.prototype, "updatedAt", void 0);
VerificationRequest = _ts_decorate([
    (0, _typeorm.Entity)('verification_requests')
], VerificationRequest);

//# sourceMappingURL=verification-request.entity.js.map