"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PlatformNotification", {
    enumerable: true,
    get: function() {
        return PlatformNotification;
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
let PlatformNotification = class PlatformNotification {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], PlatformNotification.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 160
    }),
    _ts_metadata("design:type", String)
], PlatformNotification.prototype, "campaign", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 40
    }),
    _ts_metadata("design:type", String)
], PlatformNotification.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 120
    }),
    _ts_metadata("design:type", String)
], PlatformNotification.prototype, "audience", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'draft',
            'scheduled',
            'active',
            'sent',
            'paused'
        ],
        default: 'draft'
    }),
    _ts_metadata("design:type", typeof NotificationStatus === "undefined" ? Object : NotificationStatus)
], PlatformNotification.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], PlatformNotification.prototype, "createdAt", void 0);
PlatformNotification = _ts_decorate([
    (0, _typeorm.Entity)('platform_notifications')
], PlatformNotification);

//# sourceMappingURL=platform-notification.entity.js.map