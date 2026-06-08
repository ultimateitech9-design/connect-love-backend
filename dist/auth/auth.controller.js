"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthController", {
    enumerable: true,
    get: function() {
        return AuthController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _authservice = require("./auth.service");
const _tokenblacklistservice = require("./token-blacklist.service");
const _logindto = require("./dto/login.dto");
const _registerdto = require("./dto/register.dto");
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
let AuthController = class AuthController {
    register(dto) {
        return this.authService.register(dto);
    }
    login(dto) {
        return this.authService.login(dto);
    }
    async adminLogin(dto, response) {
        const result = await this.authService.adminLogin(dto);
        // Set the token as an HTTP-only cookie
        response.cookie('admin_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24
        });
        return {
            message: 'Admin login successful',
            user: result.user
        };
    }
    async superAdminLogin(dto, response) {
        const result = await this.authService.superAdminLogin(dto);
        response.cookie('admin_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24
        });
        return {
            message: 'Super Admin login successful',
            user: result.user
        };
    }
    async marketingLogin(dto, response) {
        const result = await this.authService.marketingLogin(dto);
        response.cookie('admin_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24
        });
        return {
            message: 'Marketing login successful',
            user: result.user
        };
    }
    async financeLogin(dto, response) {
        const result = await this.authService.financeLogin(dto);
        response.cookie('admin_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24
        });
        return {
            message: 'Finance login successful',
            user: result.user
        };
    }
    async managementLogin(dto, response) {
        const result = await this.authService.managementLogin(dto);
        response.cookie('management_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24
        });
        return {
            message: 'Management login successful',
            user: result.user,
            access_token: result.access_token
        };
    }
    /**
   * POST /auth/logout
   *
   * Accepts the JWT via:
   *   1. Authorization: Bearer <token>  header  (from the logout() utility)
   *   2. Body: { token }                         (from navigator.sendBeacon on browser close)
   *
   * The token is added to the in-memory blacklist, which is checked by JwtStrategy
   * on every subsequent request.
   */ logout(authHeader, body) {
        // Extract token from header first, then fall back to body (sendBeacon payload)
        let token;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
        } else if (body?.token) {
            token = body.token;
        }
        if (token) {
            this.blacklist.blacklist(token);
        }
        return {
            message: 'Logged out successfully'
        };
    }
    constructor(authService, blacklist){
        this.authService = authService;
        this.blacklist = blacklist;
    }
};
_ts_decorate([
    (0, _common.Post)('register'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _registerdto.RegisterDto === "undefined" ? Object : _registerdto.RegisterDto
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
_ts_decorate([
    (0, _common.Post)('login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _logindto.LoginDto === "undefined" ? Object : _logindto.LoginDto
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
_ts_decorate([
    (0, _common.Post)('admin/login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _logindto.LoginDto === "undefined" ? Object : _logindto.LoginDto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "adminLogin", null);
_ts_decorate([
    (0, _common.Post)('super-admin/login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _logindto.LoginDto === "undefined" ? Object : _logindto.LoginDto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "superAdminLogin", null);
_ts_decorate([
    (0, _common.Post)('marketing/login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _logindto.LoginDto === "undefined" ? Object : _logindto.LoginDto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "marketingLogin", null);
_ts_decorate([
    (0, _common.Post)('finance/login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _logindto.LoginDto === "undefined" ? Object : _logindto.LoginDto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "financeLogin", null);
_ts_decorate([
    (0, _common.Post)('management/login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "managementLogin", null);
_ts_decorate([
    (0, _common.Post)('logout'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Headers)('authorization')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
AuthController = _ts_decorate([
    (0, _common.Controller)('auth'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService,
        typeof _tokenblacklistservice.TokenBlacklistService === "undefined" ? Object : _tokenblacklistservice.TokenBlacklistService
    ])
], AuthController);

//# sourceMappingURL=auth.controller.js.map