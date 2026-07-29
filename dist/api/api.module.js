"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ApiModule", {
    enumerable: true,
    get: function() {
        return ApiModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _platformapicontroller = require("./platform-api.controller");
const _userentity = require("../users/user.entity");
const _contactentity = require("../support/contact.entity");
const _matchentity = require("../matches/match.entity");
const _paymententity = require("../platform/payment.entity");
const _subscriptionplanentity = require("../platform/subscription-plan.entity");
const _verificationrequestentity = require("../platform/verification-request.entity");
const _platformnotificationentity = require("../platform/platform-notification.entity");
const _auditlogentity = require("../platform/audit-log.entity");
const _platformsettingentity = require("../platform/platform-setting.entity");
const _roleentity = require("../platform/role.entity");
const _rolesguard = require("../auth/roles.guard");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ApiModule = class ApiModule {
};
ApiModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _userentity.User,
                _contactentity.Contact,
                _matchentity.MatchRelation,
                _paymententity.Payment,
                _subscriptionplanentity.SubscriptionPlan,
                _verificationrequestentity.VerificationRequest,
                _platformnotificationentity.PlatformNotification,
                _auditlogentity.AuditLog,
                _platformsettingentity.PlatformSetting,
                _roleentity.PlatformRole
            ])
        ],
        controllers: [
            _platformapicontroller.PlatformApiController
        ],
        providers: [
            _rolesguard.RolesGuard
        ]
    })
], ApiModule);

//# sourceMappingURL=api.module.js.map