"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminService", {
    enumerable: true,
    get: function() {
        return AdminService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("../users/user.entity");
const _contactentity = require("../support/contact.entity");
const _paymententity = require("../platform/payment.entity");
const _verificationrequestentity = require("../platform/verification-request.entity");
const _bcryptjs = /*#__PURE__*/ _interop_require_wildcard(require("bcryptjs"));
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
let AdminService = class AdminService {
    async getStats() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalUsers = await this.userRepo.count();
        const premiumUsers = await this.userRepo.count({
            where: [
                {
                    plan: 'gold'
                },
                {
                    plan: 'platinum'
                }
            ]
        });
        const activeUsers = await this.userRepo.count({
            where: {
                status: 'active'
            }
        });
        const openTickets = await this.contactRepo.count({
            where: {
                status: 'open'
            }
        });
        const revenue = await this.paymentRepo.createQueryBuilder('payment').select('COALESCE(SUM(payment.amount), 0)', 'total').where('payment.status = :status', {
            status: 'successful'
        }).andWhere('payment.createdAt >= :monthStart', {
            monthStart
        }).getRawOne();
        return {
            totalUsers,
            premiumUsers,
            activeUsers,
            openTickets,
            revenueMtd: Number(revenue?.total || 0)
        };
    }
    async getAllUsers(page = 1, limit = 20) {
        const safePage = Math.max(1, page || 1);
        const safeLimit = Math.min(100, Math.max(1, limit || 20));
        const total = await this.userRepo.count();
        const rows = await this.userRepo.createQueryBuilder('user').select([
            'user.id',
            'user.name',
            'user.email',
            'user.role',
            'user.plan',
            'user.status',
            'user.isVerified',
            'user.city',
            'user.createdAt',
            'user.updatedAt'
        ]).orderBy('user.createdAt', 'DESC').addOrderBy('user.id', 'DESC').skip((safePage - 1) * safeLimit).take(safeLimit).getMany();
        return {
            users: rows.map((user)=>({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    plan: user.plan,
                    status: user.status,
                    isVerified: user.isVerified,
                    city: user.city,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                })),
            total,
            page: safePage,
            limit: safeLimit
        };
    }
    async createManagementUser(body, creatorRole) {
        if (body.role === 'admin' && creatorRole !== 'super_admin') {
            throw new _common.ForbiddenException('Only a Super Admin can create an Admin ID.');
        }
        const email = body.email.trim().toLowerCase();
        const existing = await this.userRepo.findOne({
            where: {
                email
            }
        });
        if (existing) throw new _common.ConflictException('An ID with this email already exists.');
        const user = await this.userRepo.save(this.userRepo.create({
            name: body.name.trim(),
            email,
            password: await _bcryptjs.hash(body.password, 12),
            role: body.role,
            plan: 'platinum',
            status: 'active',
            isVerified: true,
            onboardingCompleted: true
        }));
        const { password: _, ...safeUser } = user;
        return {
            message: 'Management ID created successfully.',
            user: safeUser
        };
    }
    async updateUserStatus(id, status) {
        await this.userRepo.update(id, {
            status: status
        });
        return {
            message: `User ${id} status updated to ${status}`
        };
    }
    async getAllContacts() {
        return this.contactRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async getPayments() {
        const payments = await this.paymentRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
        return payments.map((payment)=>({
                id: payment.id,
                userId: payment.userId,
                user: payment.user ? {
                    id: payment.user.id,
                    name: payment.user.name,
                    email: payment.user.email
                } : null,
                planName: payment.planName,
                amount: Number(payment.amount),
                currency: payment.currency,
                status: payment.status,
                createdAt: payment.createdAt
            }));
    }
    async getVerificationQueue() {
        const queue = await this.verificationRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
        return queue.map((request)=>({
                id: request.id,
                userId: request.userId,
                user: request.user ? {
                    id: request.user.id,
                    name: request.user.name,
                    email: request.user.email,
                    isVerified: request.user.isVerified
                } : null,
                idType: request.idType,
                priority: request.priority,
                status: request.status,
                createdAt: request.createdAt
            }));
    }
    async getSubscriptions() {
        const users = await this.userRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
        const free = users.filter((user)=>user.plan === 'free').length;
        const gold = users.filter((user)=>user.plan === 'gold').length;
        const platinum = users.filter((user)=>user.plan === 'platinum').length;
        return {
            totals: {
                free,
                plus: gold,
                premium: platinum
            },
            users: users.filter((user)=>user.plan !== 'free').map((user)=>({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    plan: user.plan === 'platinum' ? 'Diamond' : user.plan === 'gold' ? 'Gold' : 'Free',
                    joined: user.createdAt
                }))
        };
    }
    async getAnalytics() {
        const users = await this.userRepo.find();
        const genderRatio = Object.entries(users.reduce((acc, user)=>{
            const key = user.gender || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})).map(([name, value])=>({
                name,
                value
            }));
        const geo = Object.entries(users.reduce((acc, user)=>{
            const key = user.city || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})).map(([city, count])=>({
                city,
                users: count
            }));
        const payments = await this.paymentRepo.find({
            where: {
                status: 'successful'
            }
        });
        const revenueMonthly = payments.reduce((acc, payment)=>{
            const month = payment.createdAt.toLocaleString('en-US', {
                month: 'short'
            });
            acc[month] = (acc[month] || 0) + Number(payment.amount);
            return acc;
        }, {});
        return {
            genderRatio,
            geo,
            revenueMonthly: Object.entries(revenueMonthly).map(([m, rev])=>({
                    m,
                    rev
                }))
        };
    }
    constructor(userRepo, contactRepo, paymentRepo, verificationRepo){
        this.userRepo = userRepo;
        this.contactRepo = contactRepo;
        this.paymentRepo = paymentRepo;
        this.verificationRepo = verificationRepo;
    }
};
AdminService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_contactentity.Contact)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_paymententity.Payment)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_verificationrequestentity.VerificationRequest)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], AdminService);

//# sourceMappingURL=admin.service.js.map