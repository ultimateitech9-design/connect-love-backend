"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DiscoveryService", {
    enumerable: true,
    get: function() {
        return DiscoveryService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("../users/user.entity");
const _matchentity = require("../matches/match.entity");
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
const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 90;
function clampAge(value, fallback) {
    return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), DEFAULT_MIN_AGE), DEFAULT_MAX_AGE) : fallback;
}
function toDateOnly(date) {
    return date.toISOString().slice(0, 10);
}
function yearsAgo(years) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date;
}
let DiscoveryService = class DiscoveryService {
    async getSuggestions(currentUserId, filters = {}) {
        const currentUser = await this.userRepo.findOne({
            where: {
                id: currentUserId
            }
        });
        const ageMin = clampAge(filters.ageMin, DEFAULT_MIN_AGE);
        const ageMax = Math.max(ageMin, clampAge(filters.ageMax, DEFAULT_MAX_AGE));
        const maxBirthDate = toDateOnly(yearsAgo(ageMin));
        const minBirthDate = yearsAgo(ageMax + 1);
        minBirthDate.setDate(minBirthDate.getDate() + 1);
        // We want to find all users that are NOT the current user
        const query = this.userRepo.createQueryBuilder('user').where('user.id != :currentUserId', {
            currentUserId
        })// Only show active and verified users
        .andWhere('user.status = :status', {
            status: 'active'
        }).andWhere('user.role = :role', {
            role: 'user'
        }).andWhere('user.birthDate IS NOT NULL').andWhere('user.birthDate BETWEEN :minBirthDate AND :maxBirthDate', {
            minBirthDate: toDateOnly(minBirthDate),
            maxBirthDate
        });
        if (filters.search && filters.search.trim()) {
            query.andWhere('LOWER(user.name) LIKE :search', {
                search: `%${filters.search.toLowerCase().trim()}%`
            });
        } else {
            // Default: exclude users already swiped/matched
            query.andWhere((qb)=>{
                const subQuery = qb.subQuery().select('match.id').from(_matchentity.MatchRelation, 'match').where('(match.senderId = :currentUserId AND match.receiverId = user.id)').orWhere('(match.receiverId = :currentUserId AND match.senderId = user.id)').getQuery();
                return `NOT EXISTS ${subQuery}`;
            });
        }
        if (currentUser?.onlyShowVerifiedProfiles && !(filters.search && filters.search.trim())) {
            query.andWhere('user.isVerified = :verified', {
                verified: true
            });
        }
        const users = await query.orderBy('user.createdAt', 'DESC').limit(12).getMany();
        return users.map((user)=>{
            const { password, ...rest } = user;
            const primaryPhoto = user.avatarUrl;
            return {
                ...rest,
                age: user.age,
                avatarUrl: primaryPhoto,
                photo: primaryPhoto,
                photos: primaryPhoto ? [
                    primaryPhoto
                ] : [],
                photosVisibleToNonMatches: true,
                verified: user.isVerified,
                personality: user.personalityWords || [],
                hobbies: user.hobbies || [],
                interests: user.interests || [],
                distanceMi: null,
                goals: null
            };
        });
    }
    async getPopularTags() {
        const users = await this.userRepo.find({
            select: [
                'interests'
            ]
        });
        const interestCounts = {};
        users.forEach((u)=>{
            if (Array.isArray(u.interests)) {
                u.interests.forEach((i)=>{
                    interestCounts[i] = (interestCounts[i] || 0) + 1;
                });
            }
        });
        const sortedInterests = Object.entries(interestCounts).sort((a, b)=>b[1] - a[1]).map((entry)=>entry[0]);
        return {
            interests: sortedInterests.slice(0, 50)
        };
    }
    constructor(userRepo, matchRepo){
        this.userRepo = userRepo;
        this.matchRepo = matchRepo;
    }
};
DiscoveryService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], DiscoveryService);

//# sourceMappingURL=discovery.service.js.map