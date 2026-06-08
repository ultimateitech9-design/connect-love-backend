"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PlatformApiController", {
    enumerable: true,
    get: function() {
        return PlatformApiController;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
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
let PlatformApiController = class PlatformApiController {
    async dashboard() {
        const totalUsers = await this.userRepo.count();
        const activeUsers = await this.userRepo.count({
            where: {
                status: 'active'
            }
        });
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
        const matchesDone = await this.matchRepo.count({
            where: {
                status: _matchentity.MatchStatus.MATCHED
            }
        });
        const pendingReports = await this.contactRepo.count({
            where: {
                status: 'open'
            }
        });
        const revenue = await this.paymentRepo.createQueryBuilder('payment').select('COALESCE(SUM(payment.amount), 0)', 'total').where('payment.status = :status', {
            status: 'successful'
        }).getRawOne();
        const totalRevenue = Number(revenue?.total || 0);
        const users = await this.userRepo.find({
            select: [
                'createdAt'
            ]
        });
        const matches = await this.matchRepo.find({
            select: [
                'createdAt'
            ]
        });
        const monthly = {};
        const ensureMonth = (date)=>{
            const key = date.toLocaleString('en-US', {
                month: 'short'
            });
            monthly[key] ||= {
                m: key,
                users: 0,
                matches: 0
            };
            return monthly[key];
        };
        users.forEach((user)=>{
            ensureMonth(user.createdAt).users += 1;
        });
        matches.forEach((match)=>{
            ensureMonth(match.createdAt).matches += 1;
        });
        const growth = Object.values(monthly);
        return {
            stats: [
                {
                    label: 'Total Users',
                    value: String(totalUsers),
                    delta: '+4.2%'
                },
                {
                    label: 'Active Users',
                    value: String(activeUsers),
                    delta: '+2.8%'
                },
                {
                    label: 'Matches Done',
                    value: String(matchesDone),
                    delta: '+6.1%'
                },
                {
                    label: 'Total Revenue',
                    value: `$${totalRevenue.toLocaleString()}`,
                    delta: '+11.6%'
                },
                {
                    label: 'Pending Reports',
                    value: String(pendingReports),
                    delta: '-1.3%'
                },
                {
                    label: 'Premium Users',
                    value: String(premiumUsers),
                    delta: '+2.1%'
                }
            ],
            growth
        };
    }
    async users() {
        const users = await this.userRepo.find({
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
        return {
            users: users.map((user, index)=>({
                    id: index + 1,
                    name: user.name,
                    email: user.email,
                    account: user.plan === 'platinum' ? 'Premium Plus' : user.plan === 'gold' ? 'Premium' : 'Free Tier',
                    status: user.status === 'active' ? 'Active' : user.status === 'banned' ? 'Banned' : 'Under Review'
                }))
        };
    }
    async verification() {
        const pending = await this.verificationRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 50
        });
        return {
            queue: pending.map((request, index)=>({
                    id: index + 1,
                    name: request.user?.name || 'Unknown user',
                    idType: request.idType,
                    priority: request.priority === 'high' ? 'High' : request.priority === 'low' ? 'Low' : 'Normal',
                    status: request.status.replace('_', ' ').replace(/\b\w/g, (c)=>c.toUpperCase())
                }))
        };
    }
    async payments() {
        const plans = await this.planRepo.find({
            order: {
                sortOrder: 'ASC'
            }
        });
        const users = await this.userRepo.find({
            select: [
                'plan'
            ]
        });
        const subscriberCounts = users.reduce((acc, user)=>{
            acc[user.plan] = (acc[user.plan] || 0) + 1;
            return acc;
        }, {});
        const transactions = await this.paymentRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
        return {
            plans: plans.map((plan)=>({
                    id: plan.id,
                    name: plan.displayName,
                    key: plan.name,
                    price: Number(plan.price) === 0 ? '$0' : `$${Number(plan.price).toFixed(2)}`,
                    rawPrice: Number(plan.price),
                    period: 'monthly',
                    features: plan.features || [],
                    subscribers: subscriberCounts[plan.name] || 0,
                    status: plan.status
                })),
            transactions: transactions.map((payment)=>({
                    id: payment.id,
                    user: payment.user?.name || 'Deleted user',
                    plan: payment.planName,
                    amount: Number(payment.amount),
                    status: payment.status,
                    date: payment.createdAt.toISOString().split('T')[0]
                }))
        };
    }
    async reports() {
        const open = await this.contactRepo.count({
            where: {
                status: 'open'
            }
        });
        const reviewing = await this.contactRepo.count({
            where: {
                status: 'reviewing'
            }
        });
        const closed = await this.contactRepo.count({
            where: {
                status: 'closed'
            }
        });
        return {
            reports: [
                {
                    type: 'Open',
                    count: open
                },
                {
                    type: 'Reviewing',
                    count: reviewing
                },
                {
                    type: 'Closed',
                    count: closed
                }
            ]
        };
    }
    async notifications() {
        const notifications = await this.notificationRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
        return {
            notifications: notifications.map((notification)=>({
                    campaign: notification.campaign,
                    type: notification.type,
                    audience: notification.audience,
                    status: notification.status.replace(/\b\w/g, (c)=>c.toUpperCase())
                }))
        };
    }
    async security() {
        const logs = await this.auditRepo.find({
            order: {
                createdAt: 'ASC'
            },
            take: 7
        });
        return {
            loginActivity: logs.map((log, index)=>({
                    day: log.createdAt.toLocaleDateString('en-US', {
                        weekday: 'short'
                    }),
                    success: 80 + index * 7,
                    failed: log.action.toLowerCase().includes('failed') ? 1 : 0
                }))
        };
    }
    async settings() {
        const setting = await this.settingRepo.findOne({
            where: {
                key: 'platform_flags'
            }
        });
        const value = setting?.value || {};
        return {
            settings: {
                maintenanceMode: value.maintenanceMode ?? false,
                userRegistrations: value.userRegistrations ?? true,
                matchingSystem: value.matchingSystem ?? true,
                premiumMemberships: value.premiumMemberships ?? true
            }
        };
    }
    async roles() {
        const users = await this.userRepo.find({
            select: [
                'role'
            ]
        });
        const roles = await this.roleRepo.find({
            order: {
                role: 'ASC'
            }
        });
        const counts = users.reduce((acc, user)=>{
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});
        return {
            roles: roles.map((role)=>{
                const key = role.role.toLowerCase().replace(/ /g, '_');
                return {
                    role: role.role,
                    assignedUsers: counts[key] || 0,
                    permissions: role.permissions,
                    status: role.status
                };
            })
        };
    }
    async logs() {
        const logs = await this.auditRepo.find({
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
        return {
            logs: logs.map((log)=>({
                    user: log.user,
                    activity: log.activity,
                    ipAddress: log.ipAddress,
                    action: log.action,
                    module: log.module,
                    createdAt: log.createdAt
                }))
        };
    }
    async superAdmin() {
        const superAdmin = await this.userRepo.findOne({
            where: {
                role: 'super_admin'
            }
        });
        const logs = await this.auditRepo.find({
            order: {
                createdAt: 'DESC'
            },
            take: 5
        });
        const initials = (superAdmin?.name || 'Super Admin').split(' ').map((part)=>part[0]).join('').slice(0, 2).toUpperCase();
        return {
            superAdmin: {
                profile: {
                    id: superAdmin?.id || 'SA-001',
                    name: superAdmin?.name || 'Super Admin',
                    email: superAdmin?.email || 'superadmin@connectlove.local',
                    phone: '+1 555 0100',
                    role: 'Super Admin',
                    status: superAdmin?.status || 'active',
                    initials,
                    joinedAt: superAdmin?.createdAt?.toISOString().split('T')[0] || '2026-01-01',
                    lastLogin: logs[0]?.createdAt?.toLocaleString() || 'Today',
                    lastActive: superAdmin?.lastSeen?.toLocaleString() || 'Just now',
                    twoFactorEnabled: true,
                    ipWhitelist: [
                        '127.0.0.1'
                    ],
                    timezone: 'Asia/Calcutta',
                    sessionTimeout: '24 hours'
                },
                accessLevel: {
                    level: 'Owner',
                    totalPermissions: 42,
                    modulesAccessible: 10,
                    description: 'Full platform access'
                },
                modules: [
                    {
                        name: 'Dashboard',
                        icon: 'LayoutDashboard',
                        route: '/super-admin',
                        access: true,
                        actions: [
                            {
                                label: 'View',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'Users',
                        icon: 'Users',
                        route: '/super-admin/users',
                        access: true,
                        actions: [
                            {
                                label: 'Manage',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'Security',
                        icon: 'Lock',
                        route: '/super-admin/security',
                        access: true,
                        actions: [
                            {
                                label: 'Audit',
                                allowed: true
                            }
                        ]
                    }
                ],
                activityLog: logs.map((log)=>({
                        action: log.activity,
                        time: log.createdAt.toLocaleString(),
                        module: log.module
                    }))
            }
        };
    }
    constructor(userRepo, contactRepo, matchRepo, paymentRepo, planRepo, verificationRepo, notificationRepo, auditRepo, settingRepo, roleRepo){
        this.userRepo = userRepo;
        this.contactRepo = contactRepo;
        this.matchRepo = matchRepo;
        this.paymentRepo = paymentRepo;
        this.planRepo = planRepo;
        this.verificationRepo = verificationRepo;
        this.notificationRepo = notificationRepo;
        this.auditRepo = auditRepo;
        this.settingRepo = settingRepo;
        this.roleRepo = roleRepo;
    }
};
_ts_decorate([
    (0, _common.Get)('dashboard'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "dashboard", null);
_ts_decorate([
    (0, _common.Get)('users'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "users", null);
_ts_decorate([
    (0, _common.Get)('verification'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "verification", null);
_ts_decorate([
    (0, _common.Get)('payments'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "payments", null);
_ts_decorate([
    (0, _common.Get)('reports'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "reports", null);
_ts_decorate([
    (0, _common.Get)('notifications'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "notifications", null);
_ts_decorate([
    (0, _common.Get)('security'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "security", null);
_ts_decorate([
    (0, _common.Get)('settings'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "settings", null);
_ts_decorate([
    (0, _common.Get)('roles'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "roles", null);
_ts_decorate([
    (0, _common.Get)('logs'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "logs", null);
_ts_decorate([
    (0, _common.Get)('super-admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "superAdmin", null);
PlatformApiController = _ts_decorate([
    (0, _common.Controller)('api'),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_contactentity.Contact)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_paymententity.Payment)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_subscriptionplanentity.SubscriptionPlan)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_verificationrequestentity.VerificationRequest)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_platformnotificationentity.PlatformNotification)),
    _ts_param(7, (0, _typeorm.InjectRepository)(_auditlogentity.AuditLog)),
    _ts_param(8, (0, _typeorm.InjectRepository)(_platformsettingentity.PlatformSetting)),
    _ts_param(9, (0, _typeorm.InjectRepository)(_roleentity.PlatformRole)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], PlatformApiController);

//# sourceMappingURL=platform-api.controller.js.map