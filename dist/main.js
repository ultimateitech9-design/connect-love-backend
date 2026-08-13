"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
require("reflect-metadata");
const _core = require("@nestjs/core");
const _common = require("@nestjs/common");
const _appmodule = require("./app.module");
const _helmet = /*#__PURE__*/ _interop_require_default(require("helmet"));
const _dotenv = /*#__PURE__*/ _interop_require_wildcard(require("dotenv"));
const _jwt = require("@nestjs/jwt");
const _typeorm = require("typeorm");
const _platformsettingentity = require("./platform/platform-setting.entity");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
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
function parseAllowedOrigins() {
    const configured = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3002,https://connectlove.in,https://www.connectlove.in';
    return configured.split(',').map((origin)=>origin.trim()).filter(Boolean);
}
function isAllowedOrigin(origin) {
    if (!origin) return true;
    if (parseAllowedOrigins().includes(origin)) return true;
    // In local development the frontend is commonly opened from another device
    // through Next.js' Network URL (for example http://192.168.1.7:3002).
    if (process.env.NODE_ENV !== 'production') {
        return /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):3002$/.test(origin);
    }
    return false;
}
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule, {
        rawBody: true
    });
    app.enableShutdownHooks();
    app.setGlobalPrefix(process.env.API_PREFIX || '', {
        exclude: [
            '/health'
        ]
    });
    // Increase JSON body limit to 10 MB (needed for base64 profile photos)
    app.useBodyParser('json', {
        limit: '10mb'
    });
    app.useBodyParser('urlencoded', {
        limit: '10mb',
        extended: true
    });
    const dataSource = app.get(_typeorm.DataSource);
    const jwtService = app.get(_jwt.JwtService, {
        strict: false
    });
    let maintenanceCache = {
        enabled: false,
        checkedAt: 0
    };
    app.use(async (request, response, next)=>{
        const path = request.path.replace(/\/$/, '') || '/';
        const alwaysAllowed = path === '/api/health' || path === '/api/maintenance-status' || path === '/auth/super-admin/login' || path === '/auth/management/login';
        const paymentWebhook = path === '/payments/razorpay/webhook' || path === '/wallet/razorpay/webhook';
        if (alwaysAllowed || paymentWebhook) return next();
        try {
            if (Date.now() - maintenanceCache.checkedAt > 2_000) {
                const setting = await dataSource.getRepository(_platformsettingentity.PlatformSetting).findOne({
                    where: {
                        key: 'platform_flags'
                    }
                });
                const flags = setting?.value || {};
                maintenanceCache = {
                    enabled: flags.maintenanceMode ?? false,
                    checkedAt: Date.now()
                };
            }
            if (!maintenanceCache.enabled) return next();
            const authorization = request.headers.authorization;
            const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
            if (token) {
                const payload = await jwtService.verifyAsync(token);
                if (payload.role === 'super_admin') return next();
            }
        } catch  {
        // Invalid or expired credentials do not bypass maintenance mode.
        }
        return response.status(503).json({
            statusCode: 503,
            maintenanceMode: true,
            message: 'ConnectLove is temporarily unavailable for scheduled maintenance.'
        });
    });
    // Security: Secure HTTP headers
    app.use((0, _helmet.default)());
    // Enable CORS for independently deployed frontend origins.
    app.enableCors({
        origin: (origin, callback)=>callback(null, isAllowedOrigin(origin)),
        credentials: true
    });
    // Global validation with class-validator
    app.useGlobalPipes(new _common.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 SoulMatch API running on http://localhost:${port}`);
}
bootstrap();

//# sourceMappingURL=main.js.map