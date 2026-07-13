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
const _express = /*#__PURE__*/ _interop_require_wildcard(require("express"));
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
    const configured = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3002';
    return configured.split(',').map((origin)=>origin.trim()).filter(Boolean);
}
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule);
    app.enableShutdownHooks();
    app.setGlobalPrefix(process.env.API_PREFIX || '', {
        exclude: [
            '/health'
        ]
    });
    // Increase JSON body limit to 10 MB (needed for base64 profile photos)
    app.use(_express.json({
        limit: '10mb'
    }));
    app.use(_express.urlencoded({
        limit: '10mb',
        extended: true
    }));
    // Security: Secure HTTP headers
    app.use((0, _helmet.default)());
    // Enable CORS for independently deployed frontend origins.
    app.enableCors({
        origin: parseAllowedOrigins(),
        credentials: true
    });
    // Global validation with class-validator
    app.useGlobalPipes(new _common.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 SoulMatch API running on http://localhost:${port}`);
}
bootstrap();

//# sourceMappingURL=main.js.map