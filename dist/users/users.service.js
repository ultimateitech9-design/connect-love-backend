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
const _cointransactionentity = require("./coin-transaction.entity");
const _planentitlements = require("../plans/plan-entitlements");
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
            hobbies: user.hobbies || [],
            planBadge: (0, _planentitlements.entitlementsFor)(user).verifiedBadge
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
            planBadge: (0, _planentitlements.entitlementsFor)(user).verifiedBadge,
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
            const maxPhotos = (0, _planentitlements.entitlementsFor)(existingUser).profilePhotos;
            if (uniquePhotos.length > maxPhotos) {
                throw new _common.BadRequestException(`Your plan allows a maximum of ${maxPhotos} profile photos. Upgrade to add more.`);
            }
            const currentPhotos = existingUser.photos || [];
            for(let index = 0; index < Math.min(2, currentPhotos.length); index += 1){
                if (uniquePhotos[index] !== currentPhotos[index]) {
                    throw new _common.BadRequestException('Your first 2 profile photos are fixed and cannot be deleted or replaced.');
                }
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
        throw new _common.BadRequestException('Direct coin credit is disabled. Complete payment through Razorpay checkout.');
    }
    async spendCoins(userId, amount) {
        const coins = Number(amount);
        if (!Number.isInteger(coins) || coins < 1) {
            throw new _common.BadRequestException('Invalid coin amount.');
        }
        return this.dataSource.transaction(async (manager)=>{
            const user = await manager.getRepository(_userentity.User).findOne({
                where: {
                    id: userId
                },
                lock: {
                    mode: 'pessimistic_write'
                }
            });
            if (!user || user.coinBalance + user.earnedCoinBalance < coins) throw new _common.BadRequestException('Not enough coins. Please recharge your wallet.');
            this.deductRechargeFirst(user, coins);
            await manager.getRepository(_userentity.User).save(user);
            await manager.getRepository(_cointransactionentity.CoinTransaction).save(manager.getRepository(_cointransactionentity.CoinTransaction).create({
                type: 'theme',
                status: 'completed',
                userId,
                senderId: userId,
                receiverId: null,
                grossCoins: coins,
                userCoins: 0,
                platformCoins: coins,
                label: 'Premium theme unlock',
                payoutAccount: null
            }));
            return {
                coinBalance: user.coinBalance,
                earnedCoinBalance: user.earnedCoinBalance
            };
        });
    }
    deductRechargeFirst(user, coins) {
        const rechargeCoinsUsed = Math.min(user.coinBalance || 0, coins);
        const earnedCoinsUsed = coins - rechargeCoinsUsed;
        user.coinBalance -= rechargeCoinsUsed;
        user.earnedCoinBalance -= earnedCoinsUsed;
    }
    async sendGift(userId, receiverId, amount, label) {
        const coins = Number(amount);
        if (!receiverId || receiverId === userId) throw new _common.BadRequestException('Choose another user to receive this gift.');
        if (!Number.isInteger(coins) || coins < 1) throw new _common.BadRequestException('Invalid gift amount.');
        return this.dataSource.transaction(async (manager)=>{
            const users = await manager.getRepository(_userentity.User).find({
                where: {
                    id: (0, _typeorm1.In)([
                        userId,
                        receiverId
                    ])
                },
                lock: {
                    mode: 'pessimistic_write'
                }
            });
            const sender = users.find((user)=>user.id === userId);
            const receiver = users.find((user)=>user.id === receiverId);
            if (!sender || !receiver) throw new _common.NotFoundException('Gift sender or receiver was not found.');
            if (sender.coinBalance + sender.earnedCoinBalance < coins) throw new _common.BadRequestException('Not enough coins. Please recharge your wallet.');
            const receiverCoins = Math.floor(coins * 0.8);
            const platformCoins = coins - receiverCoins;
            this.deductRechargeFirst(sender, coins);
            receiver.earnedCoinBalance += receiverCoins;
            await manager.getRepository(_userentity.User).save([
                sender,
                receiver
            ]);
            await manager.getRepository(_cointransactionentity.CoinTransaction).save(manager.getRepository(_cointransactionentity.CoinTransaction).create({
                type: 'gift',
                status: 'completed',
                userId,
                senderId: userId,
                receiverId,
                grossCoins: coins,
                userCoins: receiverCoins,
                platformCoins,
                label: String(label || 'Gift').slice(0, 120),
                payoutAccount: null
            }));
            return {
                coinBalance: sender.coinBalance,
                earnedCoinBalance: sender.earnedCoinBalance,
                receiverCoins,
                platformCoins
            };
        });
    }
    async requestWithdrawal(userId, amount, payoutAccount) {
        throw new _common.BadRequestException('Use the secure wallet payout endpoint for withdrawals.');
    }
    async getCoinTransactions() {
        const rows = await this.coinTransactionRepo.find({
            order: {
                createdAt: 'DESC'
            },
            take: 1000
        });
        const ids = [
            ...new Set(rows.flatMap((row)=>[
                    row.userId,
                    row.senderId,
                    row.receiverId
                ]).filter((id)=>Boolean(id)))
        ];
        const users = ids.length ? await this.userRepo.find({
            select: [
                'id',
                'name',
                'email'
            ],
            where: {
                id: (0, _typeorm1.In)(ids)
            }
        }) : [];
        const names = new Map(users.map((user)=>[
                user.id,
                {
                    name: user.name,
                    email: user.email
                }
            ]));
        return rows.map((row)=>({
                ...row,
                user: row.userId ? names.get(row.userId) || null : null,
                sender: row.senderId ? names.get(row.senderId) || null : null,
                receiver: row.receiverId ? names.get(row.receiverId) || null : null
            }));
    }
    async updateWithdrawalStatus(id, status) {
        if (status !== 'completed' && status !== 'rejected') throw new _common.BadRequestException('Invalid withdrawal status.');
        return this.dataSource.transaction(async (manager)=>{
            const repository = manager.getRepository(_cointransactionentity.CoinTransaction);
            const transaction = await repository.findOne({
                where: {
                    id
                },
                lock: {
                    mode: 'pessimistic_write'
                }
            });
            if (!transaction || transaction.type !== 'withdrawal') throw new _common.NotFoundException('Withdrawal request not found.');
            if (transaction.status !== 'pending') throw new _common.BadRequestException('This withdrawal request is already processed.');
            if (status === 'rejected' && transaction.userId) {
                const user = await manager.getRepository(_userentity.User).findOne({
                    where: {
                        id: transaction.userId
                    },
                    lock: {
                        mode: 'pessimistic_write'
                    }
                });
                if (user) {
                    user.earnedCoinBalance += transaction.grossCoins;
                    await manager.getRepository(_userentity.User).save(user);
                }
            }
            transaction.status = status;
            return repository.save(transaction);
        });
    }
    constructor(userRepo, matchRepo, profileViewRepo, coinTransactionRepo, dataSource){
        this.userRepo = userRepo;
        this.matchRepo = matchRepo;
        this.profileViewRepo = profileViewRepo;
        this.coinTransactionRepo = coinTransactionRepo;
        this.dataSource = dataSource;
    }
};
UsersService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_profileviewentity.ProfileView)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_cointransactionentity.CoinTransaction)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource
    ])
], UsersService);

//# sourceMappingURL=users.service.js.map