"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "User", {
    enumerable: true,
    get: function() {
        return User;
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
let User = class User {
    // Virtual getter for Age
    get age() {
        if (!this.birthDate) return null;
        const today = new Date();
        const birthDate = new Date(this.birthDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || m === 0 && today.getDate() < birthDate.getDate()) {
            age--;
        }
        return age;
    }
    // Virtual getter for backward compatibility
    get avatarUrl() {
        return this.photos && this.photos.length > 0 ? this.photos[0] : null;
    }
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], User.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 150
    }),
    _ts_metadata("design:type", String)
], User.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true,
        length: 255
    }),
    _ts_metadata("design:type", String)
], User.prototype, "email", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        select: false
    }),
    _ts_metadata("design:type", String)
], User.prototype, "password", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'date'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], User.prototype, "birthDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 30
    }),
    _ts_metadata("design:type", String)
], User.prototype, "gender", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 100
    }),
    _ts_metadata("design:type", String)
], User.prototype, "religion", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 150
    }),
    _ts_metadata("design:type", String)
], User.prototype, "profession", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 20
    }),
    _ts_metadata("design:type", String)
], User.prototype, "height", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 150
    }),
    _ts_metadata("design:type", String)
], User.prototype, "city", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 30
    }),
    _ts_metadata("design:type", String)
], User.prototype, "relationshipGoal", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 20
    }),
    _ts_metadata("design:type", String)
], User.prototype, "zodiac", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'double'
    }),
    _ts_metadata("design:type", Number)
], User.prototype, "locationLatitude", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'double'
    }),
    _ts_metadata("design:type", Number)
], User.prototype, "locationLongitude", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], User.prototype, "interests", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], User.prototype, "personalityWords", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        length: 500
    }),
    _ts_metadata("design:type", String)
], User.prototype, "bio", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], User.prototype, "photos", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'longtext',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], User.prototype, "kycLivePhoto", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "kycMatched", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], User.prototype, "kycMatchScore", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'timestamp'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], User.prototype, "kycVerifiedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], User.prototype, "hobbies", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'free',
            'gold',
            'platinum'
        ],
        default: 'free'
    }),
    _ts_metadata("design:type", typeof UserPlan === "undefined" ? Object : UserPlan)
], User.prototype, "plan", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'datetime'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], User.prototype, "planExpiresAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'active',
            'suspended',
            'banned',
            'pending_verification'
        ],
        default: 'active'
    }),
    _ts_metadata("design:type", typeof UserStatus === "undefined" ? Object : UserStatus)
], User.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'user',
            'admin',
            'super_admin',
            'marketing',
            'sales',
            'support'
        ],
        default: 'user'
    }),
    _ts_metadata("design:type", typeof UserRole === "undefined" ? Object : UserRole)
], User.prototype, "role", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "isVerified", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'timestamp'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], User.prototype, "emailVerifiedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "onboardingCompleted", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "isOnline", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'timestamp'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], User.prototype, "lastSeen", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "showOnlineStatus", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "showDistance", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "photosVisibleToNonMatches", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "onlyShowVerifiedProfiles", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "notifyMessages", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "notifyMatches", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "notifyPush", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        unsigned: true,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], User.prototype, "coinBalance", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        unsigned: true,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], User.prototype, "earnedCoinBalance", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], User.prototype, "darkMode", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 'en',
        length: 10
    }),
    _ts_metadata("design:type", String)
], User.prototype, "language", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], User.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], User.prototype, "updatedAt", void 0);
User = _ts_decorate([
    (0, _typeorm.Entity)('users')
], User);

//# sourceMappingURL=user.entity.js.map