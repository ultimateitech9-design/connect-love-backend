"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MatchesService", {
    enumerable: true,
    get: function() {
        return MatchesService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _matchentity = require("./match.entity");
const _messageentity = require("../messages/message.entity");
const _userentity = require("../users/user.entity");
const _planusageservice = require("../plans/plan-usage.service");
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
let MatchesService = class MatchesService {
    async assertMatchCapacity(userId) {
        const { limits } = await this.planUsage.get(userId);
        const count = await this.matchesRepository.createQueryBuilder('match').where('(match.senderId = :userId OR match.receiverId = :userId)', {
            userId
        }).andWhere('match.status = :status', {
            status: _matchentity.MatchStatus.MATCHED
        }).getCount();
        if (count >= limits.matches) {
            throw new _common.BadRequestException(`Your plan allows ${limits.matches} matches. Upgrade your plan to match with more people.`);
        }
    }
    serializeUser(user) {
        if (!user) return null;
        return {
            id: user.id,
            name: user.name,
            age: user.age,
            // `photos[0]` is the card image. Do not duplicate the same large base64
            // value in `avatarUrl`, which previously doubled the response payload.
            avatarUrl: null,
            // Match cards only display the primary photo. Returning every full-size
            // base64 photo made the response tens of MB for users with many matches.
            photos: user.photos?.length ? [
                user.photos[0]
            ] : [],
            bio: user.bio,
            isOnline: user.isOnline
        };
    }
    matchesWithProfilesQuery() {
        // Match cards use a stable subset so unrelated, newly-added user columns
        // cannot break this endpoint before a production schema migration runs.
        return this.matchesRepository.createQueryBuilder('match').leftJoin('match.sender', 'sender').leftJoin('match.receiver', 'receiver').addSelect([
            'sender.id',
            'sender.name',
            'sender.birthDate',
            'sender.bio',
            'sender.photos',
            'sender.isOnline',
            'receiver.id',
            'receiver.name',
            'receiver.birthDate',
            'receiver.bio',
            'receiver.photos',
            'receiver.isOnline'
        ]);
    }
    async enrichMatches(matches, userId) {
        if (matches.length === 0) return [];
        // Fetch message metadata for every conversation in one query. The old code
        // executed two queries per match, which made this endpoint increasingly slow.
        const messageSummary = await this.msgRepo.createQueryBuilder('message').select('message.conversationId', 'conversationId').addSelect('MAX(message.createdAt)', 'lastMessageTime').addSelect('SUM(CASE WHEN message.receiverId = :userId AND message.isRead = :isRead THEN 1 ELSE 0 END)', 'unreadCount').where('message.conversationId IN (:...matchIds)', {
            matchIds: matches.map((match)=>match.id)
        }).setParameters({
            userId,
            isRead: false
        }).groupBy('message.conversationId').getRawMany();
        const summaries = new Map(messageSummary.map((row)=>[
                row.conversationId,
                row
            ]));
        const enriched = matches.map((match)=>{
            const summary = summaries.get(match.id);
            return {
                ...match,
                sender: this.serializeUser(match.sender),
                receiver: this.serializeUser(match.receiver),
                lastMessage: 'No messages yet.',
                lastMessageTime: summary?.lastMessageTime || match.createdAt,
                unreadCount: Number(summary?.unreadCount || 0)
            };
        });
        const { limits } = await this.planUsage.get(userId);
        // The first matches a member unlocked remain open. Newer matches above the
        // plan allowance are retained but locked, rather than displacing an older
        // conversation or rejecting the match entirely.
        // Use the complete active-match set so Matches and Messages unlock the
        // exact same conversations even when the dashboard response is paginated.
        const unlockedRows = limits.matches === Number.MAX_SAFE_INTEGER ? enriched.filter((match)=>match.status === _matchentity.MatchStatus.MATCHED).map((match)=>({
                id: match.id
            })) : await this.matchesRepository.createQueryBuilder('candidate').select([
            'candidate.id'
        ]).where('(candidate.senderId = :userId OR candidate.receiverId = :userId)', {
            userId
        }).andWhere('candidate.status = :status', {
            status: _matchentity.MatchStatus.MATCHED
        }).andWhere(`COALESCE(candidate.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')`).orderBy('candidate.updatedAt', 'ASC').addOrderBy('candidate.id', 'ASC').take(limits.matches).getMany();
        const allowedMatchedIds = new Set(unlockedRows.map((match)=>match.id));
        const sorted = enriched.sort((a, b)=>new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
        return sorted.map((match)=>{
            const locked = match.status === _matchentity.MatchStatus.MATCHED && !allowedMatchedIds.has(match.id);
            if (!locked) return {
                ...match,
                locked: false
            };
            const hidden = {
                id: null,
                name: 'Someone',
                photos: [],
                avatarUrl: null
            };
            return {
                ...match,
                sender: match.senderId === userId ? match.sender : hidden,
                receiver: match.receiverId === userId ? match.receiver : hidden,
                locked: true,
                lastMessage: 'Someone matched with you. Upgrade to unlock.'
            };
        });
    }
    async findExisting(senderId, receiverId) {
        return this.matchesRepository.findOne({
            where: [
                {
                    senderId,
                    receiverId
                },
                {
                    senderId: receiverId,
                    receiverId: senderId
                }
            ],
            relations: [
                'sender',
                'receiver'
            ]
        });
    }
    async findAllByStatus(userId, status) {
        const matches = await this.matchesWithProfilesQuery().where('(match.senderId = :userId OR match.receiverId = :userId)', {
            userId
        }).andWhere('match.status = :status', {
            status
        }).orderBy('match.createdAt', 'DESC').getMany();
        return this.enrichMatches(matches, userId);
    }
    async findAll(userId) {
        const matches = await this.matchesWithProfilesQuery().where('(match.senderId = :userId OR match.receiverId = :userId)', {
            userId
        }).orderBy('match.createdAt', 'DESC').getMany();
        return this.enrichMatches(matches, userId);
    }
    async findForFilter(userId, filter, limit = 12, offset = 0) {
        const query = this.matchesWithProfilesQuery().where('(match.senderId = :userId OR match.receiverId = :userId)', {
            userId
        });
        if (filter === 'active') {
            query.andWhere('match.status = :status', {
                status: _matchentity.MatchStatus.MATCHED
            }).andWhere("COALESCE(match.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')");
        } else if (filter === 'sent') {
            query.andWhere('match.status = :status AND match.senderId = :userId', {
                status: _matchentity.MatchStatus.PENDING,
                userId
            });
        } else if (filter === 'received') {
            query.andWhere('match.status = :status AND match.receiverId = :userId', {
                status: _matchentity.MatchStatus.PENDING,
                userId
            });
        } else if (filter === 'blocked') {
            query.andWhere('match.status = :status AND match.senderId = :userId', {
                status: _matchentity.MatchStatus.BLOCKED,
                userId
            });
        } else {
            query.andWhere('match.status IN (:...statuses)', {
                statuses: [
                    _matchentity.MatchStatus.MATCHED,
                    _matchentity.MatchStatus.PENDING,
                    _matchentity.MatchStatus.BLOCKED
                ]
            });
        }
        // Each dashboard tab renders a small page only. Loading every related
        // profile (and its photo) made accounts with many requests unnecessarily
        // slow to open.
        const matches = await query.orderBy('match.createdAt', 'DESC').take(Math.min(Math.max(limit, 1), 100)).skip(Math.max(offset, 0)).getMany();
        const enriched = await this.enrichMatches(matches, userId);
        if (filter !== 'received') return enriched;
        const { user, limits } = await this.planUsage.get(userId);
        if ((0, _planentitlements.activePlan)(user) !== 'free' || (0, _planentitlements.isWoman)(user)) return enriched;
        // Free members can still see and accept incoming likes until their two
        // active-match allowance is actually used.  Previously every received
        // like was blurred for a free member, which made the two included matches
        // impossible to create. Once both slots are occupied, keep later likes
        // visible in the count but lock their profile/action until an upgrade (or
        // an active match is removed).
        const activeMatchCount = await this.matchesRepository.count({
            where: [
                {
                    senderId: userId,
                    status: _matchentity.MatchStatus.MATCHED
                },
                {
                    receiverId: userId,
                    status: _matchentity.MatchStatus.MATCHED
                }
            ]
        });
        if (activeMatchCount < limits.matches) return enriched;
        return enriched.map((match)=>({
                ...match,
                sender: match.senderId === userId ? match.sender : {
                    id: null,
                    name: 'Someone',
                    photos: [],
                    avatarUrl: null
                },
                receiver: match.receiverId === userId ? match.receiver : {
                    id: null,
                    name: 'Someone',
                    photos: [],
                    avatarUrl: null
                },
                locked: true
            }));
    }
    async getSummary(userId) {
        const count = (status, field)=>{
            const where = {
                status
            };
            if (field) where[field] = userId;
            return field ? this.matchesRepository.count({
                where
            }) : this.matchesRepository.createQueryBuilder('match').where('(match.senderId = :userId OR match.receiverId = :userId)', {
                userId
            }).andWhere('match.status = :status', {
                status
            }).getCount();
        };
        const [active, sent, received, blocked] = await Promise.all([
            count(_matchentity.MatchStatus.MATCHED),
            count(_matchentity.MatchStatus.PENDING, 'senderId'),
            count(_matchentity.MatchStatus.PENDING, 'receiverId'),
            count(_matchentity.MatchStatus.BLOCKED, 'senderId')
        ]);
        return {
            active,
            sent,
            received,
            blocked
        };
    }
    async create(senderId, receiverId, isSuperLike = false) {
        const match = this.matchesRepository.create({
            senderId,
            receiverId,
            status: _matchentity.MatchStatus.PENDING,
            isSuperLike
        });
        return this.matchesRepository.save(match);
    }
    async swipe(senderId, receiverId, action) {
        if (!receiverId) throw new _common.BadRequestException('receiverId is required.');
        if (senderId === receiverId) throw new _common.BadRequestException('You cannot swipe on your own profile.');
        const receiver = await this.userRepo.findOne({
            where: {
                id: receiverId
            }
        });
        if (!receiver) throw new _common.NotFoundException('Profile not found.');
        const existing = await this.findExisting(senderId, receiverId);
        const isSuperLike = action === 'superlike';
        if (existing?.status === _matchentity.MatchStatus.BLOCKED) {
            throw new _common.BadRequestException('This profile is blocked.');
        }
        if (action === 'pass') {
            const match = existing || this.matchesRepository.create({
                senderId,
                receiverId
            });
            match.senderId = senderId;
            match.receiverId = receiverId;
            match.status = _matchentity.MatchStatus.DECLINED;
            match.isSuperLike = false;
            return this.matchesRepository.save(match);
        }
        // Retrying the same outgoing like (for example after login or a double
        // click) is idempotent and must not consume another daily like.
        if (existing?.status === _matchentity.MatchStatus.MATCHED) return existing;
        if (existing?.status === _matchentity.MatchStatus.PENDING && existing.senderId === senderId) return existing;
        if (isSuperLike) await this.planUsage.assertAndRecord(senderId, 'superLikesPerMonth', 'Super Like', receiverId);
        const existingLikesToday = await this.matchesRepository.createQueryBuilder('match').where('match.senderId = :senderId', {
            senderId
        }).andWhere('match.createdAt >= :start', {
            start: (0, _planentitlements.dayStart)()
        }).andWhere('match.status IN (:...statuses)', {
            statuses: [
                _matchentity.MatchStatus.PENDING,
                _matchentity.MatchStatus.MATCHED
            ]
        }).getCount();
        await this.planUsage.assertAndRecord(senderId, 'likesPerDay', 'Daily like', receiverId, true, undefined, existingLikesToday);
        if (existing) {
            const isIncomingLike = existing.senderId === receiverId && existing.receiverId === senderId;
            if (existing.status === _matchentity.MatchStatus.PENDING && isIncomingLike) {
                // Only the member performing the matching action must have capacity.
                // The other member may still receive the match in a locked state.
                await this.assertMatchCapacity(senderId);
                existing.status = _matchentity.MatchStatus.MATCHED;
                existing.isSuperLike = existing.isSuperLike || isSuperLike;
                return this.matchesRepository.save(existing);
            }
            existing.senderId = senderId;
            existing.receiverId = receiverId;
            existing.status = _matchentity.MatchStatus.PENDING;
            existing.isSuperLike = existing.isSuperLike || isSuperLike;
            return this.matchesRepository.save(existing);
        }
        return this.matchesRepository.save(this.matchesRepository.create({
            senderId,
            receiverId,
            status: _matchentity.MatchStatus.PENDING,
            isSuperLike
        }));
    }
    async updateStatus(id, status) {
        const match = await this.matchesRepository.findOne({
            where: {
                id
            }
        });
        if (match) {
            match.status = status;
            return this.matchesRepository.save(match);
        }
        return null;
    }
    async blockMatch(id, blockerUserId) {
        const match = await this.matchesRepository.findOne({
            where: {
                id
            }
        });
        if (!match) throw new _common.NotFoundException('Match not found.');
        if (match.senderId !== blockerUserId && match.receiverId !== blockerUserId) {
            throw new _common.ForbiddenException('You are not part of this match.');
        }
        match.status = _matchentity.MatchStatus.BLOCKED;
        if (match.senderId !== blockerUserId) {
            const temp = match.senderId;
            match.senderId = blockerUserId;
            match.receiverId = temp;
        }
        return this.matchesRepository.save(match);
    }
    async respond(id, action, userId) {
        const match = await this.matchesRepository.findOne({
            where: {
                id
            }
        });
        if (!match) throw new _common.NotFoundException('Match request not found.');
        if (userId && match.receiverId !== userId) {
            throw new _common.ForbiddenException('Only the receiver can respond to this match request.');
        }
        if (action === 'accept') {
            // The receiver is the actor here. If the other member has exhausted
            // their allowance, enrichMatches keeps this new match blurred for them.
            if (userId) await this.assertMatchCapacity(userId);
            match.status = _matchentity.MatchStatus.MATCHED;
            return this.matchesRepository.save(match);
        }
        match.status = _matchentity.MatchStatus.DECLINED;
        return this.matchesRepository.save(match);
    }
    async delete(id, userId) {
        const match = await this.matchesRepository.findOne({
            where: {
                id
            }
        });
        if (match) {
            if (userId && match.senderId !== userId && match.receiverId !== userId) {
                throw new _common.ForbiddenException('You are not part of this match.');
            }
            await this.matchesRepository.remove(match);
        }
        return {
            deleted: true
        };
    }
    async deletePendingRequest(id, senderId) {
        const match = await this.matchesRepository.findOne({
            where: {
                id
            }
        });
        if (!match) throw new _common.NotFoundException('Pending request not found.');
        if (match.senderId !== senderId) {
            throw new _common.ForbiddenException('Only the sender can delete this request.');
        }
        if (match.status !== _matchentity.MatchStatus.PENDING) {
            throw new _common.BadRequestException('Only pending requests can be deleted.');
        }
        await this.matchesRepository.remove(match);
        return {
            deleted: true
        };
    }
    async undoSwipe(senderId, receiverId) {
        const match = await this.matchesRepository.findOne({
            where: {
                senderId,
                receiverId
            }
        });
        if (!match) throw new _common.NotFoundException('Swipe not found.');
        if (match.status === _matchentity.MatchStatus.MATCHED || match.status === _matchentity.MatchStatus.BLOCKED) {
            throw new _common.BadRequestException('This swipe can no longer be undone.');
        }
        await this.planUsage.assertAndRecord(senderId, 'rewindsPerMonth', 'Profile rewind', receiverId);
        await this.matchesRepository.remove(match);
        return {
            deleted: true
        };
    }
    constructor(matchesRepository, msgRepo, userRepo, planUsage){
        this.matchesRepository = matchesRepository;
        this.msgRepo = msgRepo;
        this.userRepo = userRepo;
        this.planUsage = planUsage;
    }
};
MatchesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_messageentity.Message)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _planusageservice.PlanUsageService === "undefined" ? Object : _planusageservice.PlanUsageService
    ])
], MatchesService);

//# sourceMappingURL=matches.service.js.map