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
    get RejectNotificationDto () {
        return RejectNotificationDto;
    },
    get SavePlanDto () {
        return SavePlanDto;
    },
    get UpdateNotificationDto () {
        return UpdateNotificationDto;
    },
    get UpdatePlatformUserDto () {
        return UpdatePlatformUserDto;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _bcryptjs = /*#__PURE__*/ _interop_require_wildcard(require("bcryptjs"));
const _passport = require("@nestjs/passport");
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
const _rolesguard = require("../auth/roles.guard");
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
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(3),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "description", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(1),
    (0, _classvalidator.Max)(100),
    _ts_metadata("design:type", Number)
], CreateNotificationDto.prototype, "discountPercent", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(80),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "ctaLabel", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    (0, _classvalidator.Matches)(/^(\/|https?:\/\/)/, {
        message: 'ctaUrl must be a site path or an http(s) URL.'
    }),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "ctaUrl", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "startsAt", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateNotificationDto.prototype, "endsAt", void 0);
let UpdateNotificationDto = class UpdateNotificationDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(2),
    (0, _classvalidator.MaxLength)(160),
    _ts_metadata("design:type", String)
], UpdateNotificationDto.prototype, "campaign", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(120),
    _ts_metadata("design:type", String)
], UpdateNotificationDto.prototype, "audience", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(3),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], UpdateNotificationDto.prototype, "description", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(1),
    (0, _classvalidator.Max)(100),
    _ts_metadata("design:type", Number)
], UpdateNotificationDto.prototype, "discountPercent", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(80),
    _ts_metadata("design:type", String)
], UpdateNotificationDto.prototype, "ctaLabel", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    (0, _classvalidator.Matches)(/^(\/|https?:\/\/)/, {
        message: 'ctaUrl must be a site path or an http(s) URL.'
    }),
    _ts_metadata("design:type", String)
], UpdateNotificationDto.prototype, "ctaUrl", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateNotificationDto.prototype, "startsAt", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateNotificationDto.prototype, "endsAt", void 0);
let RejectNotificationDto = class RejectNotificationDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(3),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], RejectNotificationDto.prototype, "reason", void 0);
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
let UpdatePlatformUserDto = class UpdatePlatformUserDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "email", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "birthDate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "gender", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "profession", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "height", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "city", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "religion", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "bio", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdatePlatformUserDto.prototype, "interests", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdatePlatformUserDto.prototype, "hobbies", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdatePlatformUserDto.prototype, "personality", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdatePlatformUserDto.prototype, "photos", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "plan", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "status", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlatformUserDto.prototype, "role", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdatePlatformUserDto.prototype, "isVerified", void 0);
let PlatformApiController = class PlatformApiController {
    dayKey(date) {
        return date.toLocaleString('en-US', {
            weekday: 'short'
        });
    }
    periodDelta(current, previous) {
        if (previous === 0) return current === 0 ? '0%' : '+100%';
        const value = (current - previous) / previous * 100;
        return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    }
    normalizeRole(value) {
        return String(value || 'user').toLowerCase().replace(/[- ]/g, '_');
    }
    requestUser(request) {
        return {
            userId: String(request?.user?.userId || ''),
            role: this.normalizeRole(request?.user?.role)
        };
    }
    statusLabel(status) {
        return status === 'active' ? 'Active' : status === 'banned' ? 'Banned' : status === 'suspended' ? 'Suspended' : 'Under Review';
    }
    campaignResponse(campaign) {
        const ctr = campaign.impressions > 0 ? Number((campaign.clicks / campaign.impressions * 100).toFixed(2)) : 0;
        return {
            id: campaign.id,
            campaign: campaign.campaign,
            description: campaign.description,
            type: campaign.type,
            audience: campaign.audience,
            discountPercent: campaign.discountPercent,
            ctaLabel: campaign.ctaLabel,
            ctaUrl: campaign.ctaUrl,
            placement: campaign.placement,
            status: campaign.status,
            createdByUserId: campaign.createdByUserId,
            createdByRole: campaign.createdByRole,
            approvedByUserId: campaign.approvedByUserId,
            submittedAt: campaign.submittedAt,
            approvedAt: campaign.approvedAt,
            rejectedAt: campaign.rejectedAt,
            rejectionReason: campaign.rejectionReason,
            startsAt: campaign.startsAt,
            endsAt: campaign.endsAt,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            dismissals: campaign.dismissals,
            ctr,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt
        };
    }
    validateCampaignDates(startsAt, endsAt) {
        if (startsAt && endsAt && endsAt <= startsAt) {
            throw new _common.BadRequestException('Campaign end date must be after its start date.');
        }
    }
    canAccessCampaign(campaign, actor) {
        return actor.role === 'admin' || actor.role === 'super_admin' || actor.role === 'sales' && campaign.createdByUserId === actor.userId;
    }
    audienceMatches(audience, user) {
        const value = String(audience || 'All users').trim().toLowerCase();
        if (value === 'all' || value === 'all users' || value === 'everyone') return true;
        if (value.includes('premium')) return user.plan === 'gold' || user.plan === 'platinum';
        if (value.includes('free')) return user.plan === 'free';
        if (value.includes('gold')) return user.plan === 'gold';
        if (value.includes('platinum') || value.includes('elite')) return user.plan === 'platinum';
        if (value.startsWith('city:')) return String(user.city || '').toLowerCase() === value.slice(5).trim();
        return false;
    }
    async visibleCampaignForUser(id, request) {
        const user = await this.userRepo.findOne({
            where: {
                id: this.requestUser(request).userId
            }
        });
        const campaign = await this.notificationRepo.findOne({
            where: {
                id,
                status: 'active'
            }
        });
        const now = new Date();
        if (!user || !campaign || campaign.startsAt && campaign.startsAt > now || campaign.endsAt && campaign.endsAt < now || !this.audienceMatches(campaign.audience, user)) {
            throw new _common.NotFoundException('Campaign not found.');
        }
        return campaign;
    }
    initials(name) {
        return name.split(' ').map((part)=>part[0]).join('').slice(0, 2).toUpperCase();
    }
    currencySymbol(currency) {
        return String(currency || 'USD').toUpperCase() === 'INR' ? '₹' : '$';
    }
    normalizeSubscriptionPlan(plan) {
        return {
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
                'createdAt',
                'plan',
                'status'
            ]
        });
        const matches = await this.matchRepo.find({
            select: [
                'createdAt'
            ]
        });
        const payments = await this.paymentRepo.find({
            where: {
                status: 'successful'
            },
            select: [
                'amount',
                'createdAt'
            ]
        });
        const reports = await this.contactRepo.find({
            select: [
                'createdAt',
                'status'
            ]
        });
        const now = Date.now();
        const currentStart = now - 30 * 86400000;
        const previousStart = now - 60 * 86400000;
        const countPeriod = (rows, start, end)=>rows.filter((row)=>new Date(row.createdAt).getTime() >= start && new Date(row.createdAt).getTime() < end).length;
        const sumPeriod = (rows, start, end)=>rows.filter((row)=>new Date(row.createdAt).getTime() >= start && new Date(row.createdAt).getTime() < end).reduce((sum, row)=>sum + Number(row.amount), 0);
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
                    delta: this.periodDelta(countPeriod(users, currentStart, now), countPeriod(users, previousStart, currentStart))
                },
                {
                    label: 'Active Users',
                    value: String(activeUsers),
                    delta: 'Live DB'
                },
                {
                    label: 'Matches Done',
                    value: String(matchesDone),
                    delta: this.periodDelta(countPeriod(matches, currentStart, now), countPeriod(matches, previousStart, currentStart))
                },
                {
                    label: 'Total Revenue',
                    value: `₹${totalRevenue.toLocaleString()}`,
                    delta: this.periodDelta(sumPeriod(payments, currentStart, now), sumPeriod(payments, previousStart, currentStart))
                },
                {
                    label: 'Pending Reports',
                    value: String(pendingReports),
                    delta: this.periodDelta(countPeriod(reports, currentStart, now), countPeriod(reports, previousStart, currentStart))
                },
                {
                    label: 'Premium Users',
                    value: String(premiumUsers),
                    delta: this.periodDelta(countPeriod(users.filter((user)=>user.plan !== 'free'), currentStart, now), countPeriod(users.filter((user)=>user.plan !== 'free'), previousStart, currentStart))
                }
            ],
            growth
        };
    }
    async users(request, search, pageValue, limitValue) {
        const page = Math.max(1, Number.parseInt(pageValue || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(limitValue || '100', 10) || 100));
        const query = this.userRepo.createQueryBuilder('user').select([
            'user.id',
            'user.name',
            'user.email',
            'user.role',
            'user.plan',
            'user.city',
            'user.lastSeen',
            'user.updatedAt',
            'user.createdAt',
            'user.isVerified',
            'user.status'
        ]).orderBy('user.createdAt', 'DESC');
        const term = search?.trim().toLowerCase();
        if (term) {
            query.andWhere(`(
        LOWER(user.id) LIKE :term OR
        LOWER(user.name) LIKE :term OR
        LOWER(user.email) LIKE :term
      )`, {
                term: `%${term}%`
            });
        }
        const [users, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
        const actor = this.requestUser(request);
        return {
            total,
            page,
            limit,
            hasMore: page * limit < total,
            users: users.map((user)=>({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    ...actor.role === 'super_admin' || actor.role === 'admin' ? {
                        role: user.role
                    } : {},
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
    async getUserDetails(id, request) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        const actor = this.requestUser(request);
        const necessary = {
            id: user.id,
            name: user.name,
            email: user.email,
            city: user.city,
            isVerified: user.isVerified,
            plan: user.plan,
            account: user.plan === 'platinum' ? 'Premium Plus' : user.plan === 'gold' ? 'Premium' : 'Free Tier',
            ...actor.role === 'super_admin' || actor.role === 'admin' ? {
                role: user.role
            } : {},
            status: this.statusLabel(user.status),
            joined: user.createdAt,
            lastActive: user.lastSeen || user.updatedAt
        };
        return {
            user: actor.role === 'super_admin' ? {
                ...necessary,
                age: user.age,
                birthDate: user.birthDate,
                gender: user.gender,
                religion: user.religion,
                profession: user.profession,
                height: user.height,
                city: user.city,
                bio: user.bio,
                interests: user.interests || [],
                personality: user.personalityWords || [],
                hobbies: user.hobbies || [],
                avatarUrl: user.avatarUrl,
                photos: user.photos || []
            } : necessary
        };
    }
    async updateUser(id, body) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        if (body.email && body.email !== user.email) {
            const existing = await this.userRepo.findOne({
                where: {
                    email: body.email
                }
            });
            if (existing && existing.id !== id) return {
                message: 'A user with this email already exists.',
                user
            };
        }
        const plan = [
            'free',
            'gold',
            'platinum'
        ].includes(String(body.plan)) ? body.plan : undefined;
        const status = [
            'active',
            'suspended',
            'banned',
            'pending_verification'
        ].includes(String(body.status)) ? body.status : undefined;
        const role = [
            'user',
            'admin',
            'super_admin',
            'sales',
            'support'
        ].includes(String(body.role)) ? body.role : undefined;
        Object.assign(user, {
            ...body.name !== undefined ? {
                name: body.name
            } : {},
            ...body.email !== undefined ? {
                email: body.email
            } : {},
            ...body.birthDate !== undefined ? {
                birthDate: body.birthDate ? new Date(body.birthDate) : null
            } : {},
            ...body.gender !== undefined ? {
                gender: body.gender
            } : {},
            ...body.religion !== undefined ? {
                religion: body.religion
            } : {},
            ...body.profession !== undefined ? {
                profession: body.profession
            } : {},
            ...body.height !== undefined ? {
                height: body.height
            } : {},
            ...body.city !== undefined ? {
                city: body.city
            } : {},
            ...body.bio !== undefined ? {
                bio: body.bio
            } : {},
            ...body.interests !== undefined ? {
                interests: body.interests
            } : {},
            ...body.hobbies !== undefined ? {
                hobbies: body.hobbies
            } : {},
            ...body.personality !== undefined ? {
                personalityWords: body.personality
            } : {},
            ...body.photos !== undefined ? {
                photos: body.photos
            } : {},
            ...plan ? {
                plan
            } : {},
            ...status ? {
                status
            } : {},
            ...role ? {
                role
            } : {},
            ...body.isVerified !== undefined ? {
                isVerified: body.isVerified
            } : {}
        });
        const saved = await this.userRepo.save(user);
        await this.audit('Users', 'Update', `Updated user profile ${saved.email}`);
        const { password: _, ...safe } = saved;
        return {
            success: true,
            user: safe
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
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                status: user.status,
                isVerified: user.isVerified
            }
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
    async verification(request) {
        const includePrivateMedia = this.requestUser(request).role === 'super_admin';
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
        const reviewUsers = await this.userRepo.find({
            where: [
                {
                    role: 'user',
                    isVerified: false,
                    status: (0, _typeorm1.In)([
                        'pending_verification',
                        'active'
                    ])
                }
            ],
            order: {
                updatedAt: 'DESC',
                createdAt: 'DESC'
            },
            take: 100
        });
        const requestedUserIds = new Set(pending.map((request)=>request.userId));
        const kycUserIds = new Set(kycUsers.map((user)=>user.id));
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
                        ...includePrivateMedia ? {
                            documents: request.documents || [],
                            photo: request.user?.avatarUrl || null,
                            birthDate: request.user?.birthDate || null
                        } : {}
                    })),
                ...kycUsers.filter((user)=>!requestedUserIds.has(user.id) && !user.isVerified).map((user)=>({
                        id: `kyc-${user.id}`,
                        name: user.name || 'Unknown user',
                        email: user.email || '',
                        idType: 'Video KYC',
                        priority: user.kycMatched ? 'Normal' : 'High',
                        status: user.isVerified ? 'Approved' : user.kycMatched ? 'Pending' : 'Under Review',
                        date: user.kycVerifiedAt || user.updatedAt || user.createdAt,
                        ...includePrivateMedia ? {
                            documents: [
                                user.kycLivePhoto
                            ].filter(Boolean),
                            photo: user.avatarUrl || user.photos?.[0] || null,
                            birthDate: user.birthDate || null,
                            matchScore: user.kycMatchScore
                        } : {}
                    })),
                ...reviewUsers.filter((user)=>!requestedUserIds.has(user.id) && !kycUserIds.has(user.id)).map((user)=>({
                        id: `user-${user.id}`,
                        name: user.name || 'Unknown user',
                        email: user.email || '',
                        idType: user.status === 'pending_verification' ? 'Profile Verification' : 'Profile Review',
                        priority: user.status === 'pending_verification' ? 'High' : 'Low',
                        status: user.status === 'pending_verification' ? 'Pending' : 'Unverified',
                        date: user.updatedAt || user.createdAt,
                        ...includePrivateMedia ? {
                            documents: user.photos || [],
                            photo: user.avatarUrl || user.photos?.[0] || null,
                            birthDate: user.birthDate || null
                        } : {}
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
    async notifications(request) {
        const actor = this.requestUser(request);
        const notifications = await this.notificationRepo.find({
            ...actor.role === 'sales' ? {
                where: {
                    createdByUserId: actor.userId
                }
            } : {},
            order: {
                createdAt: 'DESC'
            }
        });
        return {
            notifications: notifications.map((notification)=>this.campaignResponse(notification))
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
        await this.audit('Admin', 'Plan created', `Created subscription plan ${plan.displayName}`);
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
        await this.audit('Admin', 'Plan updated', `Updated subscription plan ${plan.displayName}`);
        return plan;
    }
    async createNotification(body, request) {
        const actor = this.requestUser(request);
        const startsAt = body.startsAt ? new Date(body.startsAt) : null;
        const endsAt = body.endsAt ? new Date(body.endsAt) : null;
        this.validateCampaignDates(startsAt, endsAt);
        const activateNow = (actor.role === 'admin' || actor.role === 'super_admin') && body.status === 'active';
        const now = new Date();
        const notification = await this.notificationRepo.save(this.notificationRepo.create({
            campaign: body.campaign || 'Untitled campaign',
            type: body.type || 'In-app',
            audience: body.audience || 'All users',
            description: body.description,
            discountPercent: body.discountPercent ?? null,
            ctaLabel: body.ctaLabel?.trim() || 'View offer',
            ctaUrl: body.ctaUrl?.trim() || '/user/premium',
            placement: 'user_dashboard',
            status: activateNow ? 'active' : 'draft',
            createdByUserId: actor.userId,
            createdByRole: actor.role,
            approvedByUserId: activateNow ? actor.userId : null,
            approvedAt: activateNow ? now : null,
            startsAt,
            endsAt
        }));
        await this.audit('Campaigns', 'Create', `${actor.role} created campaign ${notification.campaign}`);
        return this.campaignResponse(notification);
    }
    async updateNotification(id, body, request) {
        const actor = this.requestUser(request);
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) throw new _common.NotFoundException('Campaign not found.');
        if (!this.canAccessCampaign(notification, actor)) throw new _common.ForbiddenException('You cannot edit this campaign.');
        if (actor.role === 'sales' && ![
            'draft',
            'rejected'
        ].includes(notification.status)) {
            throw new _common.ForbiddenException('Sales can edit only draft or rejected campaigns.');
        }
        const startsAt = body.startsAt !== undefined ? body.startsAt ? new Date(body.startsAt) : null : notification.startsAt;
        const endsAt = body.endsAt !== undefined ? body.endsAt ? new Date(body.endsAt) : null : notification.endsAt;
        this.validateCampaignDates(startsAt, endsAt);
        Object.assign(notification, {
            ...body.campaign !== undefined ? {
                campaign: body.campaign.trim()
            } : {},
            ...body.audience !== undefined ? {
                audience: body.audience.trim()
            } : {},
            ...body.description !== undefined ? {
                description: body.description.trim()
            } : {},
            ...body.discountPercent !== undefined ? {
                discountPercent: body.discountPercent
            } : {},
            ...body.ctaLabel !== undefined ? {
                ctaLabel: body.ctaLabel.trim()
            } : {},
            ...body.ctaUrl !== undefined ? {
                ctaUrl: body.ctaUrl.trim()
            } : {},
            ...body.startsAt !== undefined ? {
                startsAt
            } : {},
            ...body.endsAt !== undefined ? {
                endsAt
            } : {},
            ...notification.status === 'rejected' ? {
                status: 'draft',
                rejectedAt: null,
                rejectionReason: null
            } : {}
        });
        const saved = await this.notificationRepo.save(notification);
        await this.audit('Campaigns', 'Update', `${actor.role} updated campaign ${saved.campaign}`);
        return this.campaignResponse(saved);
    }
    async submitNotification(id, request) {
        const actor = this.requestUser(request);
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) throw new _common.NotFoundException('Campaign not found.');
        if (!this.canAccessCampaign(notification, actor)) throw new _common.ForbiddenException('You cannot submit this campaign.');
        if (![
            'draft',
            'rejected'
        ].includes(notification.status)) {
            throw new _common.BadRequestException('Only draft or rejected campaigns can be submitted.');
        }
        notification.status = 'pending_approval';
        notification.submittedAt = new Date();
        notification.rejectedAt = null;
        notification.rejectionReason = null;
        const saved = await this.notificationRepo.save(notification);
        await this.audit('Campaigns', 'Submit', `${actor.role} submitted campaign ${saved.campaign} for approval`);
        return this.campaignResponse(saved);
    }
    async approveNotification(id, request) {
        const actor = this.requestUser(request);
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) throw new _common.NotFoundException('Campaign not found.');
        if (![
            'pending_approval',
            'draft'
        ].includes(notification.status)) {
            throw new _common.BadRequestException('Only submitted or admin-created draft campaigns can be approved.');
        }
        notification.status = 'active';
        notification.approvedByUserId = actor.userId;
        notification.approvedAt = new Date();
        notification.rejectedAt = null;
        notification.rejectionReason = null;
        const saved = await this.notificationRepo.save(notification);
        await this.audit('Campaigns', 'Approve', `${actor.role} approved campaign ${saved.campaign}`);
        return this.campaignResponse(saved);
    }
    async rejectNotification(id, body, request) {
        const actor = this.requestUser(request);
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) throw new _common.NotFoundException('Campaign not found.');
        if (notification.status !== 'pending_approval') throw new _common.BadRequestException('Only submitted campaigns can be rejected.');
        notification.status = 'rejected';
        notification.rejectionReason = body.reason.trim();
        notification.rejectedAt = new Date();
        notification.approvedByUserId = null;
        notification.approvedAt = null;
        const saved = await this.notificationRepo.save(notification);
        await this.audit('Campaigns', 'Reject', `${actor.role} rejected campaign ${saved.campaign}`);
        return this.campaignResponse(saved);
    }
    async updateNotificationStatus(id, status) {
        const allowed = [
            'active',
            'paused',
            'expired'
        ];
        if (!allowed.includes(status)) throw new _common.BadRequestException('Unsupported campaign status change.');
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) throw new _common.NotFoundException('Campaign not found.');
        notification.status = status;
        await this.notificationRepo.save(notification);
        await this.audit('Campaigns', 'Status', `Changed ${notification.campaign} to ${status}`);
        return this.campaignResponse(notification);
    }
    async deleteNotification(id, request) {
        const actor = this.requestUser(request);
        const notification = await this.notificationRepo.findOne({
            where: {
                id
            }
        });
        if (!notification) return {
            deleted: true
        };
        if (!this.canAccessCampaign(notification, actor)) throw new _common.ForbiddenException('You cannot delete this campaign.');
        if (actor.role === 'sales' && ![
            'draft',
            'rejected'
        ].includes(notification.status)) {
            throw new _common.ForbiddenException('Sales can delete only draft or rejected campaigns.');
        }
        await this.notificationRepo.remove(notification);
        await this.audit('Campaigns', 'Delete', `${actor.role} deleted campaign ${notification.campaign}`);
        return {
            deleted: true
        };
    }
    async activeUserCampaigns(request) {
        const user = await this.userRepo.findOne({
            where: {
                id: this.requestUser(request).userId
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        const now = new Date();
        const campaigns = await this.notificationRepo.find({
            where: {
                status: 'active'
            },
            order: {
                approvedAt: 'DESC',
                createdAt: 'DESC'
            },
            take: 100
        });
        return {
            campaigns: campaigns.filter((campaign)=>(!campaign.startsAt || campaign.startsAt <= now) && (!campaign.endsAt || campaign.endsAt >= now) && this.audienceMatches(campaign.audience, user)).slice(0, 10).map((campaign)=>({
                    id: campaign.id,
                    title: campaign.campaign,
                    description: campaign.description,
                    discountPercent: campaign.discountPercent,
                    ctaLabel: campaign.ctaLabel,
                    ctaUrl: campaign.ctaUrl,
                    startsAt: campaign.startsAt,
                    endsAt: campaign.endsAt
                }))
        };
    }
    async recordCampaignImpression(id, request) {
        await this.visibleCampaignForUser(id, request);
        await this.notificationRepo.increment({
            id
        }, 'impressions', 1);
        return {
            recorded: true
        };
    }
    async recordCampaignClick(id, request) {
        await this.visibleCampaignForUser(id, request);
        await this.notificationRepo.increment({
            id
        }, 'clicks', 1);
        return {
            recorded: true
        };
    }
    async recordCampaignDismiss(id, request) {
        await this.visibleCampaignForUser(id, request);
        await this.notificationRepo.increment({
            id
        }, 'dismissals', 1);
        return {
            recorded: true
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
        const roles = (await this.roleRepo.find({
            order: {
                role: 'ASC'
            }
        })).filter((role)=>{
            const key = role.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
            return key !== 'data_entry' && key !== 'finance' && key !== 'marketing';
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
        const roleKey = body.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
        if (roleKey === 'data_entry' || roleKey === 'finance' || roleKey === 'marketing') {
            throw new _common.BadRequestException('This role is no longer available.');
        }
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
        if (body.role) {
            const roleKey = body.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
            if (roleKey === 'data_entry' || roleKey === 'finance' || roleKey === 'marketing') {
                throw new _common.BadRequestException('This role is no longer available.');
            }
        }
        Object.assign(role, {
            ...body.role !== undefined ? {
                role: body.role
            } : {},
            ...body.permissions !== undefined ? {
                permissions: body.permissions
            } : {},
            ...body.status !== undefined ? {
                status: body.status
            } : {}
        });
        await this.roleRepo.save(role);
        await this.audit('Roles', 'Update', `Updated role ${role.role}`);
        return role;
    }
    async updateVerification(id, status) {
        if (id.startsWith('user-')) {
            const userId = id.replace(/^user-/, '');
            const user = await this.userRepo.findOne({
                where: {
                    id: userId
                }
            });
            if (!user) return {
                message: 'Verification user not found.'
            };
            await this.userRepo.update(userId, {
                isVerified: status === 'approved',
                status: status === 'rejected' ? 'pending_verification' : 'active'
            });
            await this.audit('Verification', 'Update', `Profile verification ${userId} marked ${status}`);
            return {
                id,
                userId,
                status
            };
        }
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
                ...status === 'approved' ? {
                    kycVerifiedAt: user.kycVerifiedAt || new Date()
                } : {},
                ...status === 'rejected' ? {
                    kycLivePhoto: null,
                    kycMatched: false,
                    kycMatchScore: null,
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
        const successfulPayments = payments.filter((payment)=>payment.status === 'successful');
        const now = Date.now();
        const currentStart = now - 30 * 86400000;
        const previousStart = now - 60 * 86400000;
        const premiumUsers = users.filter((user)=>user.plan !== 'free');
        const currentPremiumSignups = premiumUsers.filter((user)=>new Date(user.createdAt).getTime() >= currentStart).length;
        const previousPremiumSignups = premiumUsers.filter((user)=>{
            const created = new Date(user.createdAt).getTime();
            return created >= previousStart && created < currentStart;
        }).length;
        const paymentCountByUser = successfulPayments.reduce((acc, payment)=>{
            if (payment.userId) acc[payment.userId] = (acc[payment.userId] || 0) + 1;
            return acc;
        }, {});
        const payingUserIds = Object.keys(paymentCountByUser);
        const renewedUserIds = payingUserIds.filter((userId)=>paymentCountByUser[userId] > 1);
        const renewalRate = payingUserIds.length ? renewedUserIds.length / payingUserIds.length * 100 : null;
        const conversionRate = users.length ? premiumUsers.length / users.length * 100 : 0;
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
                    value: String(premiumUsers.length),
                    delta: Number(this.periodDelta(currentPremiumSignups, previousPremiumSignups).replace('%', ''))
                },
                {
                    label: 'New Premium Users',
                    value: String(currentPremiumSignups),
                    delta: Number(this.periodDelta(currentPremiumSignups, previousPremiumSignups).replace('%', ''))
                },
                {
                    label: 'Renewal Rate',
                    value: renewalRate === null ? '—' : `${renewalRate.toFixed(1)}%`,
                    delta: 0
                },
                {
                    label: 'Conversion Rate',
                    value: `${conversionRate.toFixed(1)}%`,
                    delta: 0
                }
            ],
            revenueData: Object.values(revenueData),
            planSplit,
            recentUpgrades: successfulPayments.slice(-5).reverse().map((p)=>({
                    name: p.user?.name || 'Deleted user',
                    plan: p.planName,
                    amt: `${this.currencySymbol(p.currency)}${Number(p.amount).toFixed(2)}`,
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
    async refundPayment(id) {
        const payment = await this.paymentRepo.findOne({
            where: {
                id
            },
            relations: [
                'user'
            ]
        });
        if (!payment) throw new _common.NotFoundException('Payment not found.');
        payment.status = 'refunded';
        await this.paymentRepo.save(payment);
        await this.audit('Admin', 'Refund', `Refunded payment ${id}`);
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
        const modules = [
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
                name: 'Campaigns',
                icon: 'Bell',
                route: '/super-admin/notifications',
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
                    totalPermissions: modules.reduce((count, module)=>count + module.actions.filter((action)=>action.allowed).length, 0),
                    modulesAccessible: modules.filter((module)=>module.access).length,
                    description: 'Full platform access'
                },
                modules,
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
    (0, _rolesguard.Roles)('admin', 'super_admin', 'sales', 'support'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Query)('search')),
    _ts_param(2, (0, _common.Query)('page')),
    _ts_param(3, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "users", null);
_ts_decorate([
    (0, _common.Post)('users'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof CreatePlatformUserDto === "undefined" ? Object : CreatePlatformUserDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createUser", null);
_ts_decorate([
    (0, _common.Get)('users/:id'),
    (0, _rolesguard.Roles)('admin', 'super_admin', 'sales', 'support'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "getUserDetails", null);
_ts_decorate([
    (0, _common.Patch)('users/:id'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof UpdatePlatformUserDto === "undefined" ? Object : UpdatePlatformUserDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateUser", null);
_ts_decorate([
    (0, _common.Patch)('users/:id/status'),
    (0, _rolesguard.Roles)('admin', 'super_admin'),
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
    (0, _rolesguard.Roles)('super_admin'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "deleteUser", null);
_ts_decorate([
    (0, _common.Get)('verification'),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
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
    (0, _rolesguard.Roles)('admin', 'super_admin', 'sales'),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
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
    (0, _rolesguard.Roles)('admin', 'super_admin', 'sales'),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof CreateNotificationDto === "undefined" ? Object : CreateNotificationDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createNotification", null);
_ts_decorate([
    (0, _common.Patch)('notifications/:id'),
    (0, _rolesguard.Roles)('admin', 'super_admin', 'sales'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof UpdateNotificationDto === "undefined" ? Object : UpdateNotificationDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateNotification", null);
_ts_decorate([
    (0, _common.Post)('notifications/:id/submit'),
    (0, _rolesguard.Roles)('admin', 'super_admin', 'sales'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "submitNotification", null);
_ts_decorate([
    (0, _common.Post)('notifications/:id/approve'),
    (0, _rolesguard.Roles)('admin', 'super_admin'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "approveNotification", null);
_ts_decorate([
    (0, _common.Post)('notifications/:id/reject'),
    (0, _rolesguard.Roles)('admin', 'super_admin'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof RejectNotificationDto === "undefined" ? Object : RejectNotificationDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "rejectNotification", null);
_ts_decorate([
    (0, _common.Patch)('notifications/:id/status'),
    (0, _rolesguard.Roles)('admin', 'super_admin'),
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
    (0, _rolesguard.Roles)('admin', 'super_admin', 'sales'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "deleteNotification", null);
_ts_decorate([
    (0, _common.Get)('campaigns/active'),
    (0, _rolesguard.Roles)('user'),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "activeUserCampaigns", null);
_ts_decorate([
    (0, _common.Post)('campaigns/:id/impression'),
    (0, _rolesguard.Roles)('user'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "recordCampaignImpression", null);
_ts_decorate([
    (0, _common.Post)('campaigns/:id/click'),
    (0, _rolesguard.Roles)('user'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "recordCampaignClick", null);
_ts_decorate([
    (0, _common.Post)('campaigns/:id/dismiss'),
    (0, _rolesguard.Roles)('user'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "recordCampaignDismiss", null);
_ts_decorate([
    (0, _common.Get)('security'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "security", null);
_ts_decorate([
    (0, _common.Get)('settings'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "settings", null);
_ts_decorate([
    (0, _common.Patch)('settings'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "updateSettings", null);
_ts_decorate([
    (0, _common.Get)('roles'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "roles", null);
_ts_decorate([
    (0, _common.Post)('roles'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof CreateRoleDto === "undefined" ? Object : CreateRoleDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "createRole", null);
_ts_decorate([
    (0, _common.Patch)('roles/:id'),
    (0, _rolesguard.Roles)('super_admin'),
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
    (0, _common.Get)('sales/overview'),
    (0, _rolesguard.Roles)('sales', 'admin', 'super_admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "salesOverview", null);
_ts_decorate([
    (0, _common.Get)('sales/trends'),
    (0, _rolesguard.Roles)('sales', 'admin', 'super_admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "salesTrends", null);
_ts_decorate([
    (0, _common.Get)('sales/plans'),
    (0, _rolesguard.Roles)('sales', 'admin', 'super_admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "salesPlans", null);
_ts_decorate([
    (0, _common.Patch)('payments/:id/refund'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "refundPayment", null);
_ts_decorate([
    (0, _common.Get)('logs'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "logs", null);
_ts_decorate([
    (0, _common.Get)('super-admin'),
    (0, _rolesguard.Roles)('super_admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PlatformApiController.prototype, "superAdmin", null);
PlatformApiController = _ts_decorate([
    (0, _common.Controller)('api'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt'), _rolesguard.RolesGuard),
    (0, _rolesguard.Roles)('admin', 'super_admin'),
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