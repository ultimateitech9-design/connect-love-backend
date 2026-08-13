"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AppModule", {
    enumerable: true,
    get: function() {
        return AppModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _dotenv = /*#__PURE__*/ _interop_require_wildcard(require("dotenv"));
const _authmodule = require("./auth/auth.module");
const _usersmodule = require("./users/users.module");
const _adminmodule = require("./admin/admin.module");
const _supportmodule = require("./support/support.module");
const _healthcontroller = require("./health.controller");
const _messagesmodule = require("./messages/messages.module");
const _matchesmodule = require("./matches/matches.module");
const _discoverymodule = require("./discovery/discovery.module");
const _profilephotosmodule = require("./profile-photos/profile-photos.module");
const _apimodule = require("./api/api.module");
const _kycmodule = require("./kyc/kyc.module");
const _searchmodule = require("./search/search.module");
const _boostsmodule = require("./boosts/boosts.module");
const _chatbotmodule = require("./chatbot/chatbot.module");
const _divorcedmodule = require("./divorced/divorced.module");
const _pushnotificationsmodule = require("./push-notifications/push-notifications.module");
const _paymentsmodule = require("./payments/payments.module");
const _firstimpressionsmodule = require("./first-impressions/first-impressions.module");
const _plansmodule = require("./plans/plans.module");
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
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
_dotenv.config();
let AppModule = class AppModule {
};
AppModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forRoot({
                type: 'mysql',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '3306', 10),
                username: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD ?? 'root',
                database: process.env.DB_NAME || 'dating_web_app',
                entities: [
                    __dirname + '/**/*.entity{.ts,.js}'
                ],
                migrations: [
                    __dirname + '/migrations/*{.ts,.js}'
                ],
                // Production releases must apply pending schema changes before accepting traffic.
                // TYPEORM_MIGRATIONS_RUN remains available for explicitly enabling this locally.
                migrationsRun: process.env.NODE_ENV === 'production' || process.env.TYPEORM_MIGRATIONS_RUN === 'true',
                synchronize: false,
                logging: false,
                extra: {
                    connectionLimit: parseInt(process.env.DB_POOL_MAX || '30', 10),
                    waitForConnections: true,
                    queueLimit: parseInt(process.env.DB_POOL_QUEUE_LIMIT || '0', 10)
                }
            }),
            _authmodule.AuthModule,
            _usersmodule.UsersModule,
            _adminmodule.AdminModule,
            _supportmodule.SupportModule,
            _messagesmodule.MessagesModule,
            _matchesmodule.MatchesModule,
            _discoverymodule.DiscoveryModule,
            _profilephotosmodule.ProfilePhotosModule,
            _apimodule.ApiModule,
            _kycmodule.KycModule,
            _searchmodule.SearchModule,
            _boostsmodule.BoostsModule,
            _chatbotmodule.ChatbotModule,
            _divorcedmodule.DivorcedModule,
            _pushnotificationsmodule.PushNotificationsModule,
            _paymentsmodule.PaymentsModule,
            _firstimpressionsmodule.FirstImpressionsModule,
            _plansmodule.PlansModule
        ],
        controllers: [
            _healthcontroller.HealthController
        ]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map