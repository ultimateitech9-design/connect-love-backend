"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
require("reflect-metadata");
const _typeorm = require("typeorm");
const _dotenv = /*#__PURE__*/ _interop_require_wildcard(require("dotenv"));
const _userentity = require("./users/user.entity");
const _matchentity = require("./matches/match.entity");
const _messageentity = require("./messages/message.entity");
const _contactentity = require("./support/contact.entity");
const _subscriptionplanentity = require("./platform/subscription-plan.entity");
const _paymententity = require("./platform/payment.entity");
const _verificationrequestentity = require("./platform/verification-request.entity");
const _platformnotificationentity = require("./platform/platform-notification.entity");
const _auditlogentity = require("./platform/audit-log.entity");
const _platformsettingentity = require("./platform/platform-setting.entity");
const _roleentity = require("./platform/role.entity");
const _videocallentity = require("./messages/video-call.entity");
const _firstimpressionentity = require("./first-impressions/first-impression.entity");
const _emailregistrationotpentity = require("./auth/email-registration-otp.entity");
const _divorcedleadentity = require("./divorced/divorced-lead.entity");
const _profileviewentity = require("./users/profile-view.entity");
const _userdeviceentity = require("./push-notifications/user-device.entity");
const _cointransactionentity = require("./users/coin-transaction.entity");
const _planusageentity = require("./plans/plan-usage.entity");
const _couponentity = require("./payments/coupon.entity");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
_dotenv.config();
const _default = new _typeorm.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME || 'dating_web_app',
    entities: [
        _userentity.User,
        _matchentity.MatchRelation,
        _messageentity.Message,
        _contactentity.Contact,
        _subscriptionplanentity.SubscriptionPlan,
        _paymententity.Payment,
        _verificationrequestentity.VerificationRequest,
        _platformnotificationentity.PlatformNotification,
        _auditlogentity.AuditLog,
        _platformsettingentity.PlatformSetting,
        _roleentity.PlatformRole,
        _videocallentity.VideoCall,
        _firstimpressionentity.FirstImpression,
        _emailregistrationotpentity.EmailRegistrationOtp,
        _divorcedleadentity.DivorcedLead,
        _profileviewentity.ProfileView,
        _userdeviceentity.UserDevice,
        _cointransactionentity.CoinTransaction,
        _planusageentity.PlanUsage,
        _couponentity.Coupon
    ],
    migrations: [
        __dirname + '/migrations/*{.ts,.js}'
    ],
    synchronize: false,
    logging: false
});

//# sourceMappingURL=data-source.js.map