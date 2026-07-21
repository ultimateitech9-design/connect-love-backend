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
    serializeUser(user) {
        if (!user) return null;
        return {
            ...user,
            age: user.age,
            avatarUrl: user.avatarUrl,
            photos: user.photos || [],
            photosVisibleToNonMatches: true,
            interests: user.interests || [],
            personality: user.personalityWords || [],
            hobbies: user.hobbies || []
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
            'sender.showOnlineStatus',
            'sender.city',
            'sender.profession',
            'receiver.id',
            'receiver.name',
            'receiver.birthDate',
            'receiver.bio',
            'receiver.photos',
            'receiver.isOnline',
            'receiver.showOnlineStatus',
            'receiver.city',
            'receiver.profession'
        ]);
    }
    async enrichMatches(matches, userId) {
        const enriched = await Promise.all(matches.map(async (match)=>{
            const lastMessage = await this.msgRepo.createQueryBuilder('message').select([
                'message.content',
                'message.createdAt'
            ]).where('message.conversationId = :conversationId', {
                conversationId: match.id
            }).orderBy('message.createdAt', 'DESC').getOne();
            const unreadCount = await this.msgRepo.count({
                where: {
                    conversationId: match.id,
                    receiverId: userId,
                    isRead: false
                }
            });
            return {
                ...match,
                sender: this.serializeUser(match.sender),
                receiver: this.serializeUser(match.receiver),
                lastMessage: lastMessage ? lastMessage.content : 'No messages yet.',
                lastMessageTime: lastMessage ? lastMessage.createdAt : match.createdAt,
                unreadCount
            };
        }));
        return enriched.sort((a, b)=>new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
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
        if (existing) {
            if (existing.status === _matchentity.MatchStatus.MATCHED) return existing;
            const isIncomingLike = existing.senderId === receiverId && existing.receiverId === senderId;
            if (existing.status === _matchentity.MatchStatus.PENDING && isIncomingLike) {
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
        if (userId && match.senderId !== userId && match.receiverId !== userId) {
            throw new _common.ForbiddenException('You are not part of this match request.');
        }
        if (action === 'accept') {
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
    constructor(matchesRepository, msgRepo, userRepo){
        this.matchesRepository = matchesRepository;
        this.msgRepo = msgRepo;
        this.userRepo = userRepo;
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
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], MatchesService);

//# sourceMappingURL=matches.service.js.map