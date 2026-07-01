"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get CreateInvoiceDto () {
        return CreateInvoiceDto;
    },
    get CreateNotificationDto () {
        return CreateNotificationDto;
    },
    get CreatePlatformUserDto () {
        return CreatePlatformUserDto;
    },
    get CreateRoleDto () {
        return CreateRoleDto;
    },
    get PlatformApiController () {
        return PlatformApiController;
    },
    get SavePlanDto () {
        return SavePlanDto;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _bcryptjs = /*#__PURE__*/ _interop_require_wildcard(require("bcryptjs"));
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
const _classvalidator = require("class-validator");
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
let CreatePlatformUserDto = class CreatePlatformUserDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(2),
    _ts_metadata("design:type", String)
], CreatePlatformUserDto.prototype, "name", void 0);
_ts_decorate([
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], CreatePlatformUserDto.prototype, "email", void 0);
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(6),
    _ts_metadata("design:type", String)
], CreatePlatformUserDto.prototype, "password", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreatePlatformUserDto.prototype, "role", void 0);
let CreateNotificationDto = class CreateNotificationDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "campaign", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "type", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "audience", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "status", void 0);
let CreateRoleDto = class CreateRoleDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateRoleDto.prototype, "role", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], CreateRoleDto.prototype, "permissions", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateRoleDto.prototype, "status", void 0);
let CreateInvoiceDto = class CreateInvoiceDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "plan", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], CreateInvoiceDto.prototype, "amount", void 0);
let SavePlanDto = class SavePlanDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], SavePlanDto.prototype, "displayName", void 0);
_ts_decorate([
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], SavePlanDto.prototype, "price", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], SavePlanDto.prototype, "features", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], SavePlanDto.prototype, "status", void 0);
let PlatformApiController = class PlatformApiController {
    dayKey(date) {
        return date.toLocaleString('en-US', {
            weekday: 'short'
        });
    }
    normalizeRole(value) {
        return String(value || 'user').toLowerCase().replace(/[- ]/g, '_');
    }
    initials(name) {
        return name.split(' ').map((part)=>part[0]).join('').slice(0, 2).toUpperCase();
    }
    currencySymbol(currency) {
        return String(currency || 'USD').toUpperCase() === 'INR' ? '₹' : '$';
    }
    normalizeSubscriptionPlan(plan) {
        const canonical = {
            free: {
                displayName: 'Basic Plan',
                price: 0,
                currency: 'INR',
                features: [
                    '20 Likes per day',
                    'Basic Matching',
                    'Chat after Match',
                    'View Basic Profile'
                ]
            },
            gold: {
                displayName: 'Premium Plan',
                price: 199,
                currency: 'INR',
                features: [
                    'Unlimited Likes',
                    'See Who Liked You',
                    '5 Super Likes per day',
                    'Profile Boost (1 per week)',
                    'No Ads',
                    'Priority Matching'
                ]
            },
            platinum: {
                displayName: 'Elite Plan',
                price: 399,
                currency: 'INR',
                features: [
                    'Unlimited Likes',
                    'See Who Liked You',
                    'Unlimited Super Likes',
                    'Unlimited Profile Boost',
                    'Priority Matching',
                    'Advanced Filters',
                    'Top Search Ranking',
                    'Premium Badge',
                    'No Ads'
                ]
            }
        };
        return canonical[plan.name] || {
            displayName: plan.displayName,
            price: Number(plan.price),
            currency: plan.currency,
            features: plan.features || []
        };
    }
    async audit(module, action, activity) {
        await this.auditRepo.save(this.auditRepo.create({
            user: 'system',
            module,
            action,
            activity,
            ipAddress: '127.0.0.1'
        }));
    }
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
            select: [
                'id',
                'name',
                'email',
                'role',
                'plan',
                'city',
                'lastSeen',
                'updatedAt',
                'createdAt',
                'isVerified',
                'status'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
        return {
            users: users.map((user)=>({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    plan: user.plan,
                    account: user.plan === 'platinum' ? 'Premium Plus' : user.plan === 'gold' ? 'Premium' : 'Free Tier',
                    city: user.city || 'Unknown',
                    joined: user.createdAt,
                    lastActive: user.lastSeen || user.updatedAt,
                    isVerified: user.isVerified,
                    status: user.status === 'active' ? 'Active' : user.status === 'banned' ? 'Banned' : 'Under Review'
                }))
        };
    }
    async createUser(body) {
        const existing = await this.userRepo.findOne({
            where: {
                email: body.email
            }
        });
        if (existing) return {
            message: 'A user with this email already exists.',
            user: existing
        };
        const role = 'user';
        const password = await _bcryptjs.hash(body.password, 12);
        const user = await this.userRepo.save(this.userRepo.create({
            name: body.name,
            email: body.email,
            password,
            role,
            plan: role === 'user' ? 'free' : 'platinum',
            status: 'active',
            isVerified: role !== 'user',
            onboardingCompleted: role !== 'user'
        }));
        await this.audit('Users', 'Create', `Created ${role} account ${user.email}`);
        const { password: _, ...safe } = user;
        return {
            user: safe
        };
    }
    async getUserDetails(id) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                age: user.age,
                birthDate: user.birthDate,
                gender: user.gender,
                profession: user.profession,
                height: user.height,
                city: user.city,
                bio: user.bio,
                interests: user.interests || [],
                personality: user.personalityWords || [],
                hobbies: user.hobbies || [],
                avatarUrl: user.avatarUrl,
                photos: user.photos || [],
                isVerified: user.isVerified,
                plan: user.plan,
                role: user.role,
                status: user.status === 'active' ? 'Active' : user.status === 'banned' ? 'Banned' : 'Under Review',
                joined: user.createdAt,
                lastActive: user.lastSeen || user.updatedAt
            }
        };
    }
    async updateUserStatus(id, status) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        user.status = status;
        await this.userRepo.save(user);
        await this.audit('Users', 'Update Status', `Updated user ${user.email} status to ${status}`);
        return {
            success: true,
            user
        };
    }
    async deleteUser(id) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        await this.userRepo.remove(user);
        await this.audit('Users', 'Delete', `Deleted user account ${user.email}`);
        return {
            success: true
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
        const kycUsers = await this.userRepo.find({
            where: {
                kycLivePhoto: (0, _typeorm1.Not)((0, _typeorm1.IsNull)()),
                role: 'user'
            },
            order: {
                kycVerifiedAt: 'DESC',
                updatedAt: 'DESC'
            },
            take: 100
        });
        const requestedUserIds = new Set(pending.map((request)=>request.userId));
        return {
            queue: [
                ...pending.map((request)=>({
                        id: request.id,
                        name: request.user?.name || 'Unknown user',
                        email: request.user?.email || '',
                        idType: request.idType,
                        priority: request.priority === 'high' ? 'High' : request.priority === 'low' ? 'Low' : 'Normal',
                        status: request.status.replace('_', ' ').replace(/\b\w/g, (c)=>c.toUpperCase()),
                        date: request.createdAt,
                        documents: request.documents || [],
                        photo: request.user?.avatarUrl || null,
                        birthDate: request.user?.birthDate || null
                    })),
                ...kycUsers.filter((user)=>!requestedUserIds.has(user.id)).map((user)=>({
                        id: `kyc-${user.id}`,
                        name: user.name || 'Unknown user',
                        email: user.email || '',
                        idType: 'Video KYC',
                        priority: user.kycMatched ? 'Normal' : 'High',
                        status: user.isVerified ? 'Approved' : user.kycMatched ? 'Pending' : 'Under Review',
                        date: user.kycVerifiedAt || user.updatedAt || user.createdAt,
                        documents: [
                            user.kycLivePhoto
                        ].filter(Boolean),
                        photo: user.avatarUrl || user.photos?.[0] || null,
                        birthDate: user.birthDate || null,
                        matchScore: user.kycMatchScore
                    }))
            ]
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
            plans: plans.map((plan)=>{
                const details = this.normalizeSubscriptionPlan(plan);
                return {
                    id: plan.id,
                    name: details.displayName,
                    key: plan.name,
                    currency: details.currency,
                    price: details.price === 0 ? `${this.currencySymbol(details.currency)}0` : `${this.currencySymbol(details.currency)}${details.price.toFixed(2)}`,
                    rawPrice: details.price,
                    period: 'monthly',
                    features: details.features,
                    subscribers: subscriberCounts[plan.name] || 0,
                    status: plan.status
                };
            }),
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
                    id: notification.id,
                    campaign: notification.campaign,
                    type: notification.type,
                    audience: notification.audience,
                    status: notification.status.replace(/\b\w/g, (c)=>c.toUpperCase())
                }))
        };
    }
    async createPlan(body) {
        const key = body.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const plan = await this.planRepo.save(this.planRepo.create({
            name: key,
            displayName: body.displayName,
            price: Number(body.price || 0).toFixed(2),
            features: body.features || [],
            status: body.status === 'inactive' ? 'inactive' : 'active',
            sortOrder: await this.planRepo.count() + 1
        }));
        await this.audit('Finance', 'Plan created', `Created subscription plan ${plan.displayName}`);
        return plan;
    }
    async updatePlan(id, body) {
        const plan = await this.planRepo.findOne({
            where: {
                id
            }
        });
        if (!plan) throw new _common.NotFoundException('Plan not found.');
        plan.displayName = body.displayName;
        plan.price = Number(body.price || 0).toFixed(2);
        plan.features = body.features || plan.features;
        plan.status = body.status === 'inactive' ? 'inactive' : 'active';
        await this.planRepo.save(plan);
        await this.audit('Finance', 'Plan updated', `Updated subscription plan ${plan.displayName}`);
        return plan;
    }
    async createNotification(body) {
        const notification = await this.notificationRepo.save(this.notificationRepo.create({
            campaign: body.campaign || 'Untitled campaign',
            type: body.type || 'Push',
            audience: body.audience || 'All users',
            status: body.status || 'draft'
        }));
        await this.audit('Notifications', 'Create', `Created notification campaign ${notification.campaign}`);
        return notification;
    }
    async updateNotificationStatus(id, status) {
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) return {
            message: 'Notification campaign not found.'
        };
        notification.status = status;
        await this.notificationRepo.save(notification);
        await this.audit('Notifications', 'Update', `Changed ${notification.campaign} to ${status}`);
        return notification;
    }
    async deleteNotification(id) {
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) return {
            deleted: true
        };
        await this.notificationRepo.remove(notification);
        await this.audit('Notifications', 'Delete', `Deleted notification campaign ${notification.campaign}`);
        return {
            deleted: true
        };
    }
    async security() {
        const logs = await this.auditRepo.find({
            order: {
                createdAt: 'ASC'
            }
        });
        const weekly = logs.reduce((acc, log)=>{
            const day = log.createdAt.toLocaleDateString('en-US', {
                weekday: 'short'
            });
            acc[day] ||= {
                day,
                success: 0,
                failed: 0
            };
            if (log.action.toLowerCase().includes('fail')) acc[day].failed += 1;
            else if (log.action.toLowerCase().includes('login')) acc[day].success += 1;
            return acc;
        }, {});
        const blockedAccounts = await this.userRepo.count({
            where: {
                status: 'banned'
            }
        });
        return {
            loginActivity: Object.values(weekly),
            blockedAccounts
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
    async updateSettings(settings) {
        await this.settingRepo.save(this.settingRepo.create({
            key: 'platform_flags',
            value: settings
        }));
        await this.audit('Settings', 'Update', 'Updated platform settings');
        return {
            settings
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
    async createRole(body) {
        const role = await this.roleRepo.save(this.roleRepo.create({
            role: body.role,
            permissions: body.permissions ?? 1,
            status: body.status || 'Active'
        }));
        await this.audit('Roles', 'Create', `Created role ${role.role}`);
        return role;
    }
    async updateRole(id, body) {
        const role = await this.roleRepo.findOne({
            where: {
                id
            }
        });
        if (!role) return {
            message: 'Role not found.'
        };
        Object.assign(role, body);
        await this.roleRepo.save(role);
        await this.audit('Roles', 'Update', `Updated role ${role.role}`);
        return role;
    }
    async updateVerification(id, status) {
        if (id.startsWith('kyc-')) {
            const userId = id.replace(/^kyc-/, '');
            const user = await this.userRepo.findOne({
                where: {
                    id: userId
                }
            });
            if (!user) return {
                message: 'KYC user not found.'
            };
            await this.userRepo.update(userId, {
                isVerified: status === 'approved',
                ...status === 'rejected' ? {
                    kycMatched: false,
                    kycVerifiedAt: null
                } : {}
            });
            await this.audit('Verification', 'Update', `Video KYC ${userId} marked ${status}`);
            return {
                id,
                userId,
                status
            };
        }
        const request = await this.verificationRepo.findOne({
            where: {
                id
            },
            relations: [
                'user'
            ]
        });
        if (!request) return {
            message: 'Verification request not found.'
        };
        request.status = status;
        await this.verificationRepo.save(request);
        if (status === 'approved' || status === 'rejected') {
            await this.userRepo.update(request.userId, {
                isVerified: status === 'approved'
            });
        }
        await this.audit('Verification', 'Update', `Verification ${id} marked ${status}`);
        return request;
    }
    async marketingOverview() {
        const users = await this.userRepo.find({
            order: {
                createdAt: 'ASC'
            }
        });
        const campaigns = await this.notificationRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
        const weekly = {};
        users.forEach((user)=>{
            const day = this.dayKey(user.createdAt);
            weekly[day] ||= {
                day,
                spend: 0,
                users: 0
            };
            weekly[day].users += 1;
            weekly[day].spend += 300 + weekly[day].users * 18;
        });
        const channelData = [
            {
                channel: 'Organic',
                value: users.filter((u)=>u.plan === 'free').length
            },
            {
                channel: 'Premium Referral',
                value: users.filter((u)=>u.plan !== 'free').length
            },
            {
                channel: 'Campaigns',
                value: campaigns.length
            },
            {
                channel: 'Support Leads',
                value: await this.contactRepo.count()
            }
        ];
        const totalSpend = Object.values(weekly).reduce((sum, row)=>sum + row.spend, 0);
        const premiumUsers = users.filter((u)=>u.plan !== 'free').length;
        const conversionRate = users.length ? (premiumUsers / users.length * 100).toFixed(1) : '0.0';
        return {
            kpis: [
                {
                    label: 'Total Marketing Spend',
                    value: `$${totalSpend.toLocaleString()}`,
                    delta: '+8.4%'
                },
                {
                    label: 'New Users Acquired',
                    value: users.length.toLocaleString(),
                    delta: '+4.2%'
                },
                {
                    label: 'Active Campaigns',
                    value: String(campaigns.filter((c)=>c.status === 'active').length),
                    delta: `${campaigns.length} total`
                },
                {
                    label: 'Cost Per Acquisition',
                    value: `$${users.length ? (totalSpend / users.length).toFixed(2) : '0.00'}`,
                    delta: '-2.1%'
                },
                {
                    label: 'Conversion Rate',
                    value: `${conversionRate}%`,
                    delta: '+1.1%'
                }
            ],
            spendTrend: Object.values(weekly),
            channelData
        };
    }
    async marketingCampaigns() {
        const campaigns = await this.notificationRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
        return {
            campaigns: campaigns.map((c, index)=>({
                    id: c.id,
                    name: c.campaign,
                    channel: c.type,
                    status: c.status,
                    audience: c.audience,
                    spend: 1200 + index * 730,
                    conversions: 80 + index * 31,
                    roi: 1.8 + index * 0.2
                }))
        };
    }
    async marketingReports() {
        const users = await this.userRepo.find({
            select: [
                'createdAt',
                'plan'
            ]
        });
        const campaigns = await this.notificationRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
        const contacts = await this.contactRepo.count();
        const premiumUsers = users.filter((user)=>user.plan !== 'free').length;
        return {
            reports: [
                {
                    title: 'Daily Report',
                    desc: 'Users, campaigns, and support leads created today.',
                    meta: `${users.filter((user)=>user.createdAt.toDateString() === new Date().toDateString()).length} users today`,
                    type: 'daily'
                },
                {
                    title: 'Users Report',
                    desc: 'Live user acquisition and premium conversion summary.',
                    meta: `${users.length} users, ${premiumUsers} premium`,
                    type: 'users'
                },
                {
                    title: 'Campaigns Report',
                    desc: 'Notification campaigns currently stored in the platform.',
                    meta: `${campaigns.length} campaigns`,
                    type: 'campaigns'
                },
                {
                    title: 'Leads Report',
                    desc: 'Support/contact leads submitted from the website.',
                    meta: `${contacts} leads`,
                    type: 'leads'
                }
            ]
        };
    }
    async salesOverview() {
        const payments = await this.paymentRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'ASC'
            }
        });
        const users = await this.userRepo.find();
        const revenueData = {};
        payments.forEach((payment)=>{
            const day = this.dayKey(payment.createdAt);
            revenueData[day] ||= {
                day,
                revenue: 0,
                signups: 0
            };
            revenueData[day].revenue += Number(payment.amount);
        });
        users.forEach((user)=>{
            const day = this.dayKey(user.createdAt);
            revenueData[day] ||= {
                day,
                revenue: 0,
                signups: 0
            };
            revenueData[day].signups += 1;
        });
        const planSplit = Object.entries(users.reduce((acc, user)=>{
            acc[user.plan] = (acc[user.plan] || 0) + 1;
            return acc;
        }, {})).map(([name, value])=>({
                name,
                value
            }));
        return {
            kpis: [
                {
                    label: 'Total Subscriptions',
                    value: String(users.filter((u)=>u.plan !== 'free').length),
                    delta: 8.4
                },
                {
                    label: 'New Premium Users',
                    value: String(users.filter((u)=>u.plan !== 'free').length),
                    delta: 4.1
                },
                {
                    label: 'Renewal Rate',
                    value: '78.6%',
                    delta: 2.3
                },
                {
                    label: 'Conversion Rate',
                    value: `${users.length ? (users.filter((u)=>u.plan !== 'free').length / users.length * 100).toFixed(1) : '0.0'}%`,
                    delta: -1.1
                }
            ],
            revenueData: Object.values(revenueData),
            planSplit,
            recentUpgrades: payments.slice(-5).reverse().map((p)=>({
                    name: p.user?.name || 'Deleted user',
                    plan: p.planName,
                    amt: `$${Number(p.amount).toFixed(2)}`,
                    t: p.createdAt.toLocaleString()
                }))
        };
    }
    async salesTrends() {
        const payments = await this.paymentRepo.find({
            order: {
                createdAt: 'ASC'
            }
        });
        const successful = payments.filter((payment)=>payment.status === 'successful');
        const now = new Date();
        const monthKey = (date)=>date.toLocaleString('en-US', {
                month: 'short'
            });
        const weekOfMonth = (date)=>`W${Math.ceil(date.getDate() / 7)}`;
        const sameDay = (date)=>date.toDateString() === now.toDateString();
        const sameMonth = (date)=>date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        const monthly = Object.values(successful.reduce((acc, payment)=>{
            const key = monthKey(payment.createdAt);
            acc[key] ||= {
                m: key,
                sales: 0,
                growth: 0
            };
            acc[key].sales += Number(payment.amount);
            return acc;
        }, {})).map((row, index, rows)=>({
                ...row,
                growth: index > 0 && rows[index - 1].sales > 0 ? Number(((row.sales - rows[index - 1].sales) / rows[index - 1].sales * 100).toFixed(1)) : 0
            }));
        const weekly = Object.values(successful.filter((payment)=>sameMonth(payment.createdAt)).reduce((acc, payment)=>{
            const key = weekOfMonth(payment.createdAt);
            acc[key] ||= {
                w: key,
                sales: 0
            };
            acc[key].sales += Number(payment.amount);
            return acc;
        }, {}));
        const todaySales = successful.filter((payment)=>sameDay(payment.createdAt)).reduce((sum, payment)=>sum + Number(payment.amount), 0);
        const weekSales = successful.filter((payment)=>sameMonth(payment.createdAt) && weekOfMonth(payment.createdAt) === weekOfMonth(now)).reduce((sum, payment)=>sum + Number(payment.amount), 0);
        const monthSales = successful.filter((payment)=>sameMonth(payment.createdAt)).reduce((sum, payment)=>sum + Number(payment.amount), 0);
        return {
            kpis: {
                todaySales,
                weekSales,
                monthSales,
                threeMonthGrowth: monthly.slice(-3).reduce((sum, row)=>sum + row.growth, 0)
            },
            monthly,
            weekly
        };
    }
    async salesPlans() {
        const plans = await this.planRepo.find({
            order: {
                sortOrder: 'ASC'
            }
        });
        const users = await this.userRepo.find({
            select: [
                'plan',
                'city'
            ]
        });
        return {
            plans: plans.map((plan)=>{
                const details = this.normalizeSubscriptionPlan(plan);
                return {
                    id: plan.id,
                    key: plan.name,
                    name: details.displayName,
                    price: details.price,
                    currency: details.currency,
                    features: details.features,
                    status: plan.status,
                    subscribers: users.filter((u)=>u.plan === plan.name).length
                };
            }),
            topMarkets: Object.entries(users.reduce((acc, user)=>{
                const city = user.city || 'Unknown';
                acc[city] = (acc[city] || 0) + 1;
                return acc;
            }, {})).map(([city, value])=>({
                    city,
                    value
                })).slice(0, 8)
        };
    }
    async financeRefunds() {
        const payments = await this.paymentRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        return {
            refunds: payments.map((p)=>({
                    id: p.id,
                    user: p.user?.name || 'Deleted user',
                    plan: p.planName,
                    amount: Number(p.amount),
                    status: p.status === 'refunded' ? 'Approved' : p.status === 'failed' ? 'Rejected' : 'Requests',
                    date: p.createdAt.toISOString().slice(0, 10)
                }))
        };
    }
    async financeNotifications() {
        const payments = await this.paymentRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 20
        });
        return {
            notifications: payments.map((payment)=>({
                    id: payment.id,
                    title: payment.status === 'failed' ? 'Payment Failed' : payment.status === 'refunded' ? 'Refund Processed' : payment.status === 'successful' ? 'Payment Received' : 'Payment Pending',
                    message: `${payment.user?.name || payment.user?.email || 'Unassigned user'} - ${payment.planName} - ${payment.currency} ${Number(payment.amount).toFixed(2)}`,
                    time: payment.createdAt,
                    type: payment.status === 'failed' ? 'error' : payment.status === 'successful' ? 'success' : 'info'
                }))
        };
    }
    async refundPayment(id) {
        const payment = await this.paymentRepo.findOne({
            where: {
                id
            },
            relations: [
                'user'
            ]
        });
        if (!payment) return {
            message: 'Payment not found.'
        };
        payment.status = 'refunded';
        await this.paymentRepo.save(payment);
        await this.audit('Finance', 'Refund', `Refunded payment ${id}`);
        return payment;
    }
    async rejectRefund(id) {
        const payment = await this.paymentRepo.findOne({
            where: {
                id
            }
        });
        if (!payment) throw new _common.NotFoundException('Payment not found.');
        payment.status = 'failed';
        await this.paymentRepo.save(payment);
        await this.audit('Finance', 'Refund rejected', `Rejected refund request for payment ${id}`);
        return payment;
    }
    async invoices() {
        const payments = await this.paymentRepo.find({
            relations: [
                'user'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        return {
            invoices: payments.map((p, index)=>({
                    id: `INV-${String(index + 1).padStart(4, '0')}`,
                    customer: p.user?.name || 'Deleted user',
                    email: p.user?.email || '',
                    plan: p.planName,
                    amount: Number(p.amount),
                    status: p.status === 'successful' ? 'Paid' : p.status === 'failed' ? 'Overdue' : 'Unpaid',
                    due: p.createdAt.toISOString().slice(0, 10),
                    paymentId: p.id
                }))
        };
    }
    async createInvoice(body) {
        const payment = await this.paymentRepo.save(this.paymentRepo.create({
            planName: body.plan || 'Invoice',
            amount: Number(body.amount || 0).toFixed(2),
            currency: 'USD',
            status: 'pending'
        }));
        await this.audit('Finance', 'Invoice', `Created invoice payment ${payment.id}`);
        return payment;
    }
    async logs() {
        const logs = await this.auditRepo.find({
            order: {
                createdAt: 'DESC'
            },
            take: 250
        });
        const now = Date.now();
        return {
            logs: logs.map((log)=>({
                    id: log.id,
                    user: log.user,
                    activity: log.activity,
                    ipAddress: log.ipAddress,
                    action: log.action,
                    module: log.module,
                    role: log.role,
                    device: log.device,
                    loginAt: log.loginAt,
                    lastActivityAt: log.lastActivityAt,
                    logoutAt: log.logoutAt,
                    durationSeconds: log.loginAt ? log.durationSeconds ?? Math.max(0, Math.floor((now - new Date(log.loginAt).getTime()) / 1000)) : null,
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
        if (!superAdmin) throw new _common.NotFoundException('Super admin account not found. Run npm run db:setup in the backend.');
        const logs = await this.auditRepo.find({
            order: {
                createdAt: 'DESC'
            },
            take: 5
        });
        const ipWhitelist = [
            ...new Set(logs.map((log)=>log.ipAddress).filter(Boolean))
        ];
        return {
            superAdmin: {
                profile: {
                    id: superAdmin.id,
                    name: superAdmin.name,
                    email: superAdmin.email,
                    phone: '',
                    role: 'Super Admin',
                    status: superAdmin.status,
                    initials: this.initials(superAdmin.name),
                    joinedAt: superAdmin.createdAt.toISOString().split('T')[0],
                    lastLogin: logs.find((log)=>log.action.toLowerCase().includes('login'))?.createdAt?.toLocaleString() || '',
                    lastActive: superAdmin.lastSeen?.toLocaleString() || '',
                    twoFactorEnabled: false,
                    ipWhitelist,
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
                        name: 'Verification',
                        icon: 'ShieldCheck',
                        route: '/super-admin/verification',
                        access: true,
                        actions: [
                            {
                                label: 'Review',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'Payments',
                        icon: 'CreditCard',
                        route: '/super-admin/payments',
                        access: true,
                        actions: [
                            {
                                label: 'Manage',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'Reports',
                        icon: 'Flag',
                        route: '/super-admin/reports',
                        access: true,
                        actions: [
                            {
                                label: 'Moderate',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'Notifications',
                        icon: 'Bell',
                        route: '/super-admin/notifications',
                        access: true,
                        actions: [
                            {
                                label: 'Send',
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
                    },
                    {
                        name: 'Settings',
                        icon: 'Settings',
                        route: '/super-admin/settings',
                        access: true,
                        actions: [
                            {
                                label: 'Configure',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'Roles & Permissions',
                        icon: 'KeyRound',
                        route: '/super-admin/roles',
                        access: true,
                        actions: [
                            {
                                label: 'Manage',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'System Logs',
                        icon: 'ScrollText',
                        route: '/super-admin/logs',
                        access: true,
                        actions: [
                            {
                                label: 'View',
                                allowed: true
                            }
                        ]
                    },
                    {
                        name: 'Super Admin Profile',
                        icon: 'User',
                        route: '/super-admin/super-admin',
                        access: true,
                        actions: [
                            {
                                label: 'Update',
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
    (0, _common.Post)('users'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof CreatePlatformUserDto === "undefined" ? Object : CreatePlatformUserDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createUser", null);
_ts_decorate([
    (0, _common.Get)('users/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "getUserDetails", null);
_ts_decorate([
    (0, _common.Patch)('users/:id/status'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateUserStatus", null);
_ts_decorate([
    (0, _common.Delete)('users/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "deleteUser", null);
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
    (0, _common.Post)('plans'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof SavePlanDto === "undefined" ? Object : SavePlanDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createPlan", null);
_ts_decorate([
    (0, _common.Patch)('plans/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof SavePlanDto === "undefined" ? Object : SavePlanDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updatePlan", null);
_ts_decorate([
    (0, _common.Post)('notifications'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof CreateNotificationDto === "undefined" ? Object : CreateNotificationDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createNotification", null);
_ts_decorate([
    (0, _common.Patch)('notifications/:id/status'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _platformnotificationentity.NotificationStatus === "undefined" ? Object : _platformnotificationentity.NotificationStatus
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateNotificationStatus", null);
_ts_decorate([
    (0, _common.Delete)('notifications/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "deleteNotification", null);
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
    (0, _common.Patch)('settings'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateSettings", null);
_ts_decorate([
    (0, _common.Get)('roles'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "roles", null);
_ts_decorate([
    (0, _common.Post)('roles'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof CreateRoleDto === "undefined" ? Object : CreateRoleDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createRole", null);
_ts_decorate([
    (0, _common.Patch)('roles/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateRole", null);
_ts_decorate([
    (0, _common.Patch)('verification/:id/status'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _verificationrequestentity.VerificationStatus === "undefined" ? Object : _verificationrequestentity.VerificationStatus
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateVerification", null);
_ts_decorate([
    (0, _common.Get)('marketing/overview'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "marketingOverview", null);
_ts_decorate([
    (0, _common.Get)('marketing/campaigns'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "marketingCampaigns", null);
_ts_decorate([
    (0, _common.Get)('marketing/reports'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "marketingReports", null);
_ts_decorate([
    (0, _common.Get)('sales/overview'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "salesOverview", null);
_ts_decorate([
    (0, _common.Get)('sales/trends'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "salesTrends", null);
_ts_decorate([
    (0, _common.Get)('sales/plans'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "salesPlans", null);
_ts_decorate([
    (0, _common.Get)('finance/refunds'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "financeRefunds", null);
_ts_decorate([
    (0, _common.Get)('finance/notifications'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "financeNotifications", null);
_ts_decorate([
    (0, _common.Patch)('finance/payments/:id/refund'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "refundPayment", null);
_ts_decorate([
    (0, _common.Patch)('finance/payments/:id/reject-refund'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "rejectRefund", null);
_ts_decorate([
    (0, _common.Get)('finance/invoices'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "invoices", null);
_ts_decorate([
    (0, _common.Post)('finance/invoices'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof CreateInvoiceDto === "undefined" ? Object : CreateInvoiceDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createInvoice", null);
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