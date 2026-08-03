"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UsersService", {
    enumerable: true,
    get: function() {
        return UsersService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("./user.entity");
const _matchentity = require("../matches/match.entity");
const _profileviewentity = require("./profile-view.entity");
const _distance = require("../location/distance");
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
const normalizeTags = (tags)=>{
    if (!tags || !Array.isArray(tags)) return tags;
    return [
        ...new Set(tags.map((t)=>t.trim().toLowerCase().replace(/\b\w/g, (l)=>l.toUpperCase())).filter(Boolean))
    ];
};
let UsersService = class UsersService {
    serializeUser(user) {
        return {
            ...user,
            religion: user.religion,
            age: user.age,
            avatarUrl: user.avatarUrl,
            photos: user.photos || [],
            kycLivePhoto: user.kycLivePhoto,
            kycMatched: user.kycMatched,
            kycMatchScore: user.kycMatchScore,
            kycVerifiedAt: user.kycVerifiedAt,
            photosVisibleToNonMatches: true,
            interests: user.interests || [],
            personalityWords: user.personalityWords || [],
            personality: user.personalityWords || [],
            hobbies: user.hobbies || []
        };
    }
    async findById(id) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        return this.serializeUser(user);
    }
    async findProfileDetails(id, viewerId) {
        const [user, viewer] = await Promise.all([
            this.userRepo.findOne({
                where: {
                    id
                }
            }),
            this.userRepo.findOne({
                where: {
                    id: viewerId
                },
                select: [
                    'id',
                    'locationLatitude',
                    'locationLongitude'
                ]
            })
        ]);
        if (!user) throw new _common.NotFoundException('User not found.');
        await this.recordProfileView(id, viewerId);
        const distanceKm = user.showDistance && viewer ? (0, _distance.distanceBetweenKm)(viewer.locationLatitude, viewer.locationLongitude, user.locationLatitude, user.locationLongitude) : null;
        return {
            id: user.id,
            name: user.name,
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
            photos: user.photos || [],
            kycMatched: user.kycMatched,
            kycMatchScore: user.kycMatchScore,
            photosVisibleToNonMatches: true,
            isVerified: user.isVerified,
            showDistance: user.showDistance,
            distanceKm
        };
    }
    async findAll() {
        return this.userRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async update(id, data) {
        const existingUser = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!existingUser) throw new _common.NotFoundException('User not found.');
        const sanitizedData = {
            ...data
        };
        if (sanitizedData.photos) {
            const uniquePhotos = [
                ...new Set(sanitizedData.photos.filter(Boolean))
            ];
            if (uniquePhotos.length > 5) {
                throw new _common.BadRequestException('Maximum 5 photos allowed.');
            }
            if (uniquePhotos.length < (existingUser.photos?.length || 0)) {
                throw new _common.BadRequestException('Profile photos cannot be deleted. Replace an existing photo instead.');
            }
            const photosChanged = JSON.stringify(existingUser.photos || []) !== JSON.stringify(uniquePhotos);
            sanitizedData.photos = uniquePhotos;
            if (photosChanged) {
                // A verified face must never remain attached to a different photo set.
                sanitizedData.kycLivePhoto = null;
                sanitizedData.kycMatched = false;
                sanitizedData.kycMatchScore = null;
                sanitizedData.kycVerifiedAt = null;
                sanitizedData.isVerified = false;
                sanitizedData.onboardingCompleted = false;
            }
        }
        if (sanitizedData.interests) {
            sanitizedData.interests = normalizeTags(sanitizedData.interests);
        }
        if (sanitizedData.personalityWords) {
            sanitizedData.personalityWords = normalizeTags(sanitizedData.personalityWords);
        }
        if (sanitizedData.hobbies) {
            sanitizedData.hobbies = normalizeTags(sanitizedData.hobbies);
        }
        if (sanitizedData.onboardingCompleted) {
            const photos = sanitizedData.photos ?? existingUser.photos ?? [];
            if (!photos.length) {
                throw new _common.BadRequestException('Add at least one profile photo before completing onboarding.');
            }
        // Video KYC is optional during onboarding. Successful KYC separately sets
        // kycMatched/isVerified, which controls the verified badge.
        }
        sanitizedData.photosVisibleToNonMatches = true;
        // Only update fields that are part of the DTO (safe update)
        await this.userRepo.update(id, sanitizedData);
        return this.findById(id);
    }
    async remove(id) {
        const user = await this.findById(id);
        await this.userRepo.delete(id);
        return {
            message: `User ${user.name} deleted.`
        };
    }
    async removeMe(id) {
        const user = await this.findById(id);
        // TypeORM ON DELETE CASCADE will handle matches and messages automatically
        await this.userRepo.delete(id);
        return {
            message: `Your account and all associated data have been permanently deleted.`
        };
    }
    async exportMe(id) {
        const user = await this.findById(id);
        return {
            exportedAt: new Date().toISOString(),
            user
        };
    }
    async deactivateMe(id) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        await this.userRepo.update(id, {
            status: 'suspended',
            isOnline: false,
            lastSeen: new Date()
        });
        return {
            message: 'Your account has been deactivated. Contact support when you want to reactivate it.'
        };
    }
    async updatePresence(userId, isOnline) {
        const updateData = {
            isOnline
        };
        if (!isOnline) {
            updateData.lastSeen = new Date();
        }
        await this.userRepo.update(userId, updateData);
    }
    async recordProfileView(profileUserId, viewerUserId) {
        if (!viewerUserId || profileUserId === viewerUserId) return;
        // Store at most one view per viewer/profile pair per day. This keeps reloads
        // from inflating the insight while retaining a useful visit history.
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        const alreadyRecorded = await this.profileViewRepo.findOne({
            where: {
                profileUserId,
                viewerUserId,
                createdAt: (0, _typeorm1.MoreThanOrEqual)(since)
            },
            select: [
                'id'
            ]
        });
        if (!alreadyRecorded) {
            await this.profileViewRepo.save(this.profileViewRepo.create({
                profileUserId,
                viewerUserId
            }));
        }
    }
    compatibilityScore(owner, other) {
        const normalize = (values)=>new Set((values || []).map((value)=>value.trim().toLowerCase()).filter(Boolean));
        const overlap = (left, right)=>{
            const a = normalize(left);
            const b = normalize(right);
            if (!a.size && !b.size) return null;
            const shared = [
                ...a
            ].filter((value)=>b.has(value)).length;
            const total = new Set([
                ...a,
                ...b
            ]).size;
            return total ? shared / total : 0;
        };
        const tagScores = [
            overlap(owner.interests, other.interests),
            overlap(owner.personalityWords, other.personalityWords),
            overlap(owner.hobbies, other.hobbies)
        ].filter((value)=>value !== null);
        const tagAverage = tagScores.length ? tagScores.reduce((sum, value)=>sum + value, 0) / tagScores.length : 0;
        const sameGoal = owner.relationshipGoal && other.relationshipGoal && owner.relationshipGoal.toLowerCase() === other.relationshipGoal.toLowerCase() ? 1 : 0;
        const sameCity = owner.city && other.city && owner.city.toLowerCase() === other.city.toLowerCase() ? 1 : 0;
        const sameReligion = owner.religion && other.religion && owner.religion.toLowerCase() === other.religion.toLowerCase() ? 1 : 0;
        return Math.round((tagAverage * 0.7 + sameGoal * 0.15 + sameCity * 0.1 + sameReligion * 0.05) * 100);
    }
    async getProfileInsights(userId) {
        const owner = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        if (!owner) throw new _common.NotFoundException('User not found.');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const viewsResult = await this.profileViewRepo.createQueryBuilder('view').select('COUNT(DISTINCT view.viewerUserId)', 'count').where('view.profileUserId = :userId', {
            userId
        }).andWhere('view.createdAt >= :sevenDaysAgo', {
            sevenDaysAgo
        }).getRawOne();
        const receivedLikes = await this.matchRepo.find({
            where: [
                {
                    receiverId: userId,
                    status: _matchentity.MatchStatus.PENDING
                },
                {
                    receiverId: userId,
                    status: _matchentity.MatchStatus.MATCHED
                }
            ],
            select: [
                'senderId'
            ]
        });
        const likerIds = [
            ...new Set(receivedLikes.map((like)=>like.senderId))
        ];
        const likers = likerIds.length ? await this.userRepo.createQueryBuilder('user').where('user.id IN (:...likerIds)', {
            likerIds
        }).getMany() : [];
        const scores = likers.map((liker)=>this.compatibilityScore(owner, liker));
        return {
            profileViews7d: Number(viewsResult?.count || 0),
            likesReceived: likerIds.length,
            compatibilityAverage: scores.length ? Math.round(scores.reduce((sum, score)=>sum + score, 0) / scores.length) : null
        };
    }
    async rechargeCoins(userId, amount) {
        const coins = Number(amount);
        if (!Number.isInteger(coins) || coins < 1 || coins > 100000) {
            throw new _common.BadRequestException('Enter a valid recharge amount between 1 and 100000 coins.');
        }
        const user = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        await this.userRepo.increment({
            id: userId
        }, 'coinBalance', coins);
        const updated = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        return {
            coinBalance: updated?.coinBalance || 0
        };
    }
    async spendCoins(userId, amount) {
        const coins = Number(amount);
        if (!Number.isInteger(coins) || coins < 1) {
            throw new _common.BadRequestException('Invalid coin amount.');
        }
        const result = await this.userRepo.createQueryBuilder().update(_userentity.User).set({
            coinBalance: ()=>`coinBalance - ${coins}`
        }).where('id = :userId', {
            userId
        }).andWhere('coinBalance >= :coins', {
            coins
        }).execute();
        if (!result.affected) throw new _common.BadRequestException('Not enough coins. Please recharge your wallet.');
        const updated = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        return {
            coinBalance: updated?.coinBalance || 0
        };
    }
    constructor(userRepo, matchRepo, profileViewRepo){
        this.userRepo = userRepo;
        this.matchRepo = matchRepo;
        this.profileViewRepo = profileViewRepo;
    }
};
UsersService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_profileviewentity.ProfileView)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], UsersService);

//# sourceMappingURL=users.service.js.map