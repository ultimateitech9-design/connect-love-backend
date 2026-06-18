"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthService", {
    enumerable: true,
    get: function() {
        return AuthService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _jwt = require("@nestjs/jwt");
const _bcryptjs = /*#__PURE__*/ _interop_require_wildcard(require("bcryptjs"));
const _cryptojs = /*#__PURE__*/ _interop_require_wildcard(require("crypto-js"));
const _userentity = require("../users/user.entity");
const _auditlogentity = require("../platform/audit-log.entity");
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
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let AuthService = class AuthService {
    decryptOrUsePlainPassword(password) {
        try {
            const secret = process.env.CRYPTO_SECRET || 'fallback-secret-key';
            const bytes = _cryptojs.AES.decrypt(password, secret);
            const decrypted = bytes.toString(_cryptojs.enc.Utf8);
            return decrypted || password;
        } catch  {
            return password;
        }
    }
    signUserToken(user, sessionId) {
        return this.jwtService.sign({
            sub: user.id,
            email: user.email,
            plan: user.plan,
            role: user.role || 'user',
            sid: sessionId
        });
    }
    async startSession(user, context = {}) {
        const now = new Date();
        const log = await this.auditRepo.save(this.auditRepo.create({
            userId: user.id,
            user: user.name || user.email,
            activity: 'Logged in',
            ipAddress: context.ipAddress || 'Unknown',
            action: 'Active',
            module: 'Authentication',
            role: user.role || 'user',
            device: (context.device || 'Unknown device').slice(0, 255),
            loginAt: now,
            lastActivityAt: now
        }));
        log.sessionId = log.id;
        return this.auditRepo.save(log);
    }
    async touchSession(token) {
        const payload = this.readToken(token);
        if (!payload?.sid) return {
            updated: false
        };
        const log = await this.auditRepo.findOne({
            where: {
                sessionId: payload.sid
            }
        });
        if (!log || log.logoutAt) return {
            updated: false
        };
        log.lastActivityAt = new Date();
        log.durationSeconds = Math.max(0, Math.floor((log.lastActivityAt.getTime() - log.loginAt.getTime()) / 1000));
        await this.auditRepo.save(log);
        return {
            updated: true
        };
    }
    async endSession(token) {
        const payload = this.readToken(token);
        if (!payload?.sid) return;
        const log = await this.auditRepo.findOne({
            where: {
                sessionId: payload.sid
            }
        });
        if (!log || log.logoutAt) return;
        const now = new Date();
        log.logoutAt = now;
        log.lastActivityAt = now;
        log.durationSeconds = Math.max(0, Math.floor((now.getTime() - log.loginAt.getTime()) / 1000));
        log.activity = 'Logged out';
        log.action = 'Completed';
        await this.auditRepo.save(log);
    }
    readToken(token) {
        if (!token) return null;
        try {
            return this.jwtService.verify(token);
        } catch  {
            return null;
        }
    }
    async register(dto) {
        const existing = await this.userRepo.findOne({
            where: {
                email: dto.email
            }
        });
        if (existing) {
            throw new _common.ConflictException('An account with this email already exists.');
        }
        const hashed = await _bcryptjs.hash(dto.password, 12);
        const user = this.userRepo.create({
            name: dto.name,
            email: dto.email,
            password: hashed,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            gender: dto.gender,
            city: dto.city,
            locationLatitude: dto.locationLatitude,
            locationLongitude: dto.locationLongitude
        });
        const saved = await this.userRepo.save(user);
        const { password: _, ...safe } = saved;
        return {
            message: 'Account created successfully',
            user: safe
        };
    }
    async login(dto, context = {}) {
        const user = await this.userRepo.createQueryBuilder('u').addSelect('u.password').where('u.email = :email', {
            email: dto.email
        }).getOne();
        if (!user) throw new _common.UnauthorizedException('Invalid email or password.');
        if (user.role !== 'user') {
            throw new _common.UnauthorizedException('Please use the management login for this account.');
        }
        const match = await _bcryptjs.compare(dto.password, user.password);
        if (!match) throw new _common.UnauthorizedException('Invalid email or password.');
        const session = await this.startSession(user, context);
        const token = this.signUserToken(user, session.sessionId);
        return {
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role,
                onboardingCompleted: user.onboardingCompleted
            }
        };
    }
    async adminLogin(dto, context = {}) {
        const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);
        // 2. Find user
        const user = await this.userRepo.createQueryBuilder('u').addSelect('u.password').where('u.email = :email', {
            email: dto.email
        }).getOne();
        if (!user) throw new _common.UnauthorizedException('Invalid email or password.');
        // 3. Ensure role is admin or super_admin
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            throw new _common.UnauthorizedException('Access denied. Admin privileges required.');
        }
        // 4. Verify password
        const match = await _bcryptjs.compare(decryptedPassword, user.password);
        if (!match) throw new _common.UnauthorizedException('Invalid email or password.');
        const session = await this.startSession(user, context);
        const token = this.signUserToken(user, session.sessionId);
        return {
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }
    async superAdminLogin(dto, context = {}) {
        const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);
        const user = await this.userRepo.createQueryBuilder('u').addSelect('u.password').where('u.email = :email', {
            email: dto.email
        }).getOne();
        if (!user) throw new _common.UnauthorizedException('Invalid email or password.');
        if (user.role !== 'super_admin') {
            throw new _common.UnauthorizedException('Access denied. Super Admin privileges required.');
        }
        const match = await _bcryptjs.compare(decryptedPassword, user.password);
        if (!match) throw new _common.UnauthorizedException('Invalid email or password.');
        const session = await this.startSession(user, context);
        const token = this.signUserToken(user, session.sessionId);
        return {
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }
    async marketingLogin(dto, context = {}) {
        const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);
        const user = await this.userRepo.createQueryBuilder('u').addSelect('u.password').where('u.email = :email', {
            email: dto.email
        }).getOne();
        if (!user) throw new _common.UnauthorizedException('Invalid email or password.');
        if (user.role !== 'marketing' && user.role !== 'super_admin') {
            throw new _common.UnauthorizedException('Access denied. Marketing privileges required.');
        }
        const match = await _bcryptjs.compare(decryptedPassword, user.password);
        if (!match) throw new _common.UnauthorizedException('Invalid email or password.');
        const session = await this.startSession(user, context);
        const token = this.signUserToken(user, session.sessionId);
        return {
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }
    async financeLogin(dto, context = {}) {
        const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);
        const user = await this.userRepo.createQueryBuilder('u').addSelect('u.password').where('u.email = :email', {
            email: dto.email
        }).getOne();
        if (!user) throw new _common.UnauthorizedException('Invalid email or password.');
        if (user.role !== 'finance' && user.role !== 'super_admin') {
            throw new _common.UnauthorizedException('Access denied. Finance privileges required.');
        }
        const match = await _bcryptjs.compare(decryptedPassword, user.password);
        if (!match) throw new _common.UnauthorizedException('Invalid email or password.');
        const session = await this.startSession(user, context);
        const token = this.signUserToken(user, session.sessionId);
        return {
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }
    async managementLogin(dto, context = {}) {
        const roleMap = {
            admin: [
                'admin',
                'super_admin'
            ],
            'super-admin': [
                'super_admin'
            ],
            marketing: [
                'marketing',
                'super_admin'
            ],
            finance: [
                'finance',
                'super_admin'
            ],
            sales: [
                'sales',
                'super_admin'
            ],
            support: [
                'support',
                'admin',
                'super_admin'
            ]
        };
        const allowedRoles = roleMap[dto.role];
        if (!allowedRoles) {
            throw new _common.UnauthorizedException('Unknown management role.');
        }
        const user = await this.userRepo.createQueryBuilder('u').addSelect('u.password').where('u.email = :email', {
            email: dto.email
        }).getOne();
        if (!user) throw new _common.UnauthorizedException('Invalid email or password.');
        if (!allowedRoles.includes(user.role)) {
            throw new _common.UnauthorizedException('Access denied for this management portal.');
        }
        const password = this.decryptOrUsePlainPassword(dto.password);
        const match = await _bcryptjs.compare(password, user.password);
        if (!match) throw new _common.UnauthorizedException('Invalid email or password.');
        const session = await this.startSession(user, context);
        const token = this.signUserToken(user, session.sessionId);
        return {
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }
    constructor(userRepo, auditRepo, jwtService){
        this.userRepo = userRepo;
        this.auditRepo = auditRepo;
        this.jwtService = jwtService;
    }
};
AuthService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_auditlogentity.AuditLog)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService
    ])
], AuthService);

//# sourceMappingURL=auth.service.js.map