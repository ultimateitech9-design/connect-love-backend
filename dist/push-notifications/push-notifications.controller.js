"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PushNotificationsController", {
    enumerable: true,
    get: function() {
        return PushNotificationsController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _registerdevicedto = require("./dto/register-device.dto");
const _unregisterdevicedto = require("./dto/unregister-device.dto");
const _pushnotificationsservice = require("./push-notifications.service");
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
let PushNotificationsController = class PushNotificationsController {
    registerDevice(req, dto) {
        return this.pushNotifications.registerDevice(req.user.userId, dto);
    }
    listDevices(req) {
        return this.pushNotifications.listDevices(req.user.userId);
    }
    unregisterDevice(req, dto) {
        return this.pushNotifications.unregisterDevice(req.user.userId, dto);
    }
    unregisterAllDevices(req) {
        return this.pushNotifications.unregisterAllDevices(req.user.userId);
    }
    constructor(pushNotifications){
        this.pushNotifications = pushNotifications;
    }
};
_ts_decorate([
    (0, _common.Post)('devices'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _registerdevicedto.RegisterDeviceDto === "undefined" ? Object : _registerdevicedto.RegisterDeviceDto
    ]),
    _ts_metadata("design:returntype", void 0)
], PushNotificationsController.prototype, "registerDevice", null);
_ts_decorate([
    (0, _common.Get)('devices'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], PushNotificationsController.prototype, "listDevices", null);
_ts_decorate([
    (0, _common.Delete)('devices'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _unregisterdevicedto.UnregisterDeviceDto === "undefined" ? Object : _unregisterdevicedto.UnregisterDeviceDto
    ]),
    _ts_metadata("design:returntype", void 0)
], PushNotificationsController.prototype, "unregisterDevice", null);
_ts_decorate([
    (0, _common.Delete)('devices/all'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], PushNotificationsController.prototype, "unregisterAllDevices", null);
PushNotificationsController = _ts_decorate([
    (0, _common.Controller)('push'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _pushnotificationsservice.PushNotificationsService === "undefined" ? Object : _pushnotificationsservice.PushNotificationsService
    ])
], PushNotificationsController);

//# sourceMappingURL=push-notifications.controller.js.map