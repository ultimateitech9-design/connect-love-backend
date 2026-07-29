"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PushNotificationsModule", {
    enumerable: true,
    get: function() {
        return PushNotificationsModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _userentity = require("../users/user.entity");
const _pushnotificationscontroller = require("./push-notifications.controller");
const _pushnotificationsservice = require("./push-notifications.service");
const _userdeviceentity = require("./user-device.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let PushNotificationsModule = class PushNotificationsModule {
};
PushNotificationsModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _userdeviceentity.UserDevice,
                _userentity.User
            ])
        ],
        controllers: [
            _pushnotificationscontroller.PushNotificationsController
        ],
        providers: [
            _pushnotificationsservice.PushNotificationsService
        ],
        exports: [
            _pushnotificationsservice.PushNotificationsService
        ]
    })
], PushNotificationsModule);

//# sourceMappingURL=push-notifications.module.js.map