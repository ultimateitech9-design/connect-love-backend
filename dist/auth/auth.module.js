"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthModule", {
    enumerable: true,
    get: function() {
        return AuthModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _jwt = require("@nestjs/jwt");
const _passport = require("@nestjs/passport");
const _dotenv = /*#__PURE__*/ _interop_require_wildcard(require("dotenv"));
const _authcontroller = require("./auth.controller");
const _authservice = require("./auth.service");
const _jwtstrategy = require("./jwt.strategy");
const _tokenblacklistservice = require("./token-blacklist.service");
const _userentity = require("../users/user.entity");
const _auditlogentity = require("../platform/audit-log.entity");
const _emailregistrationotpentity = require("./email-registration-otp.entity");
const _registrationotpservice = require("./registration-otp.service");
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
let AuthModule = class AuthModule {
};
AuthModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _userentity.User,
                _auditlogentity.AuditLog,
                _emailregistrationotpentity.EmailRegistrationOtp
            ]),
            _passport.PassportModule,
            _jwt.JwtModule.register({
                secret: process.env.JWT_SECRET || 'soulmatch_super_secret_key_change_in_production',
                signOptions: {
                    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
                }
            })
        ],
        controllers: [
            _authcontroller.AuthController
        ],
        providers: [
            _authservice.AuthService,
            _jwtstrategy.JwtStrategy,
            _tokenblacklistservice.TokenBlacklistService,
            _registrationotpservice.RegistrationOtpService
        ],
        exports: [
            _jwt.JwtModule,
            _tokenblacklistservice.TokenBlacklistService
        ]
    })
], AuthModule);

//# sourceMappingURL=auth.module.js.map