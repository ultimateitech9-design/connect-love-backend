"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FirstImpressionsService", {
    enumerable: true,
    get: function() {
        return FirstImpressionsService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("../users/user.entity");
const _firstimpressionentity = require("./first-impression.entity");
const _pushnotificationsservice = require("../push-notifications/push-notifications.service");
const _planusageservice = require("../plans/plan-usage.service");
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
let FirstImpressionsService = class FirstImpressionsService {
    async send(senderId, receiverId, rawContent) {
        const content = String(rawContent || '').trim();
        if (!receiverId || senderId === receiverId) throw new _common.BadRequestException('Invalid profile.');
        if (!content) throw new _common.BadRequestException('Write a message first.');
        if (content.length > 280) throw new _common.BadRequestException('Message must be 280 characters or fewer.');
        if (!await this.users.exist({
            where: {
                id: receiverId,
                role: 'user'
            }
        })) throw new _common.NotFoundException('Profile not found.');
        if (await this.impressions.exist({
            where: {
                senderId,
                receiverId
            }
        })) {
            throw new _common.ConflictException('You have already sent this user a First Impression.');
        }
        const quota = await this.planUsage.assertAndRecord(senderId, 'firstImpressionsPerMonth', 'First Impression', receiverId);
        let saved;
        try {
            saved = await this.impressions.save(this.impressions.create({
                senderId,
                receiverId,
                content
            }));
        } catch (error) {
            if (error?.driverError?.code === 'ER_DUP_ENTRY' || error?.code === 'ER_DUP_ENTRY') {
                throw new _common.ConflictException('You have already sent this user a First Impression.');
            }
            throw error;
        }
        // A First Impression is also a normal profile like. This makes the profile
        // appear in Sent Likes for the sender and Likes Received for the receiver.
        // Do not replace or duplicate an existing relation between the same users.
        const relation = await this.matches.findOne({
            where: [
                {
                    senderId,
                    receiverId
                },
                {
                    senderId: receiverId,
                    receiverId: senderId
                }
            ]
        });
        if (!relation) {
            await this.matches.save(this.matches.create({
                senderId,
                receiverId,
                status: _matchentity.MatchStatus.PENDING,
                isSuperLike: false
            }));
        }
        void this.pushNotifications.sendToUser(receiverId, {
            title: 'New First Impression',
            body: 'Someone sent you a First Impression.',
            data: {
                type: 'first_impression',
                firstImpressionId: saved.id,
                url: '/user/messages'
            }
        }).catch(()=>undefined);
        return {
            id: saved.id,
            createdAt: saved.createdAt,
            remainingToday: quota.remaining
        };
    }
    async received(userId) {
        const receiver = await this.users.findOne({
            where: {
                id: userId
            },
            select: [
                'id',
                'gender',
                'plan',
                'planExpiresAt'
            ]
        });
        if (!receiver) throw new _common.NotFoundException('User not found.');
        // First Impressions are free to reveal for women. A paid plan still
        // reveals them for every other recipient.
        const gender = String(receiver.gender || '').trim().toLowerCase();
        const isWoman = [
            'female',
            'woman',
            'women',
            'girl',
            'ladies',
            'f'
        ].includes(gender);
        const unlocked = isWoman || receiver.plan !== 'free' && (!receiver.planExpiresAt || receiver.planExpiresAt > new Date());
        const rows = await this.impressions.find({
            where: {
                receiverId: userId
            },
            relations: [
                'sender'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 50
        });
        return {
            unlocked,
            items: rows.map((row)=>({
                    id: row.id,
                    sender: unlocked ? {
                        id: row.sender.id,
                        name: row.sender.name,
                        photo: row.sender.photos?.[0] || null
                    } : {
                        id: null,
                        name: 'Someone',
                        photo: null
                    },
                    content: unlocked ? row.content : null,
                    locked: !unlocked,
                    isRead: row.isRead,
                    createdAt: row.createdAt
                }))
        };
    }
    constructor(impressions, users, matches, pushNotifications, planUsage){
        this.impressions = impressions;
        this.users = users;
        this.matches = matches;
        this.pushNotifications = pushNotifications;
        this.planUsage = planUsage;
    }
};
FirstImpressionsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_firstimpressionentity.FirstImpression)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _pushnotificationsservice.PushNotificationsService === "undefined" ? Object : _pushnotificationsservice.PushNotificationsService,
        typeof _planusageservice.PlanUsageService === "undefined" ? Object : _planusageservice.PlanUsageService
    ])
], FirstImpressionsService);

//# sourceMappingURL=first-impressions.service.js.map