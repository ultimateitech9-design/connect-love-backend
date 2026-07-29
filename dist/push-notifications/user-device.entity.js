"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserDevice", {
    enumerable: true,
    get: function() {
        return UserDevice;
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
let UserDevice = class UserDevice {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], UserDevice.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 36
    }),
    _ts_metadata("design:type", String)
], UserDevice.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], UserDevice.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 512,
        unique: true,
        charset: 'ascii',
        collation: 'ascii_bin'
    }),
    _ts_metadata("design:type", String)
], UserDevice.prototype, "token", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 20,
        default: 'unknown'
    }),
    _ts_metadata("design:type", typeof DevicePlatform === "undefined" ? Object : DevicePlatform)
], UserDevice.prototype, "platform", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 191,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UserDevice.prototype, "deviceId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 100,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UserDevice.prototype, "deviceName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 50,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UserDevice.prototype, "appVersion", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], UserDevice.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'datetime',
        precision: 6
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], UserDevice.prototype, "lastSeenAt", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)({
        type: 'datetime',
        precision: 6
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], UserDevice.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)({
        type: 'datetime',
        precision: 6
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], UserDevice.prototype, "updatedAt", void 0);
UserDevice = _ts_decorate([
    (0, _typeorm.Entity)('user_devices'),
    (0, _typeorm.Index)('IDX_user_devices_user_active', [
        'userId',
        'isActive'
    ]),
    (0, _typeorm.Index)('IDX_user_devices_user_device', [
        'userId',
        'deviceId'
    ])
], UserDevice);

//# sourceMappingURL=user-device.entity.js.map