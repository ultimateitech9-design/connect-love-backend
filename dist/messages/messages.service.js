"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MessagesService", {
    enumerable: true,
    get: function() {
        return MessagesService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _crypto = require("crypto");
const _messageentity = require("./message.entity");
const _matchentity = require("../matches/match.entity");
const _userentity = require("../users/user.entity");
const _pushnotificationsservice = require("../push-notifications/push-notifications.service");
const _planusageservice = require("../plans/plan-usage.service");
const _firstimpressionentity = require("../first-impressions/first-impression.entity");
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
const CALL_LOG_PREFIX = '__call_log__:';
let MessagesService = class MessagesService {
    queueMessagePush(message) {
        void (async ()=>{
            const [sender, receiver] = await Promise.all([
                this.userRepo.findOne({
                    where: {
                        id: message.senderId
                    },
                    select: [
                        'id',
                        'name'
                    ]
                }),
                this.userRepo.findOne({
                    where: {
                        id: message.receiverId
                    },
                    select: [
                        'id',
                        'notifyMessages'
                    ]
                })
            ]);
            if (!receiver?.notifyMessages) return;
            const cleanContent = String(message.content || '').replace(/\s+/g, ' ').trim();
            const preview = cleanContent.length > 120 ? `${cleanContent.slice(0, 117)}â€¦` : cleanContent;
            await this.pushNotifications.sendToUser(message.receiverId, {
                title: sender?.name ? `New message from ${sender.name}` : 'New message',
                body: preview || 'You received a new message.',
                data: {
                    type: 'message',
                    messageId: message.id,
                    conversationId: message.conversationId,
                    senderId: message.senderId
                }
            });
        })().catch((error)=>{
            this.logger.warn(`Could not queue message push: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
    }
    isOptionalMessageSchemaMismatch(error) {
        const code = error?.driverError?.code || error?.code;
        return code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_DEFAULT_FOR_FIELD';
    }
    normalizeCoreMessage(row) {
        return {
            ...row,
            isRead: Boolean(row.isRead),
            reactions: null,
            deletedForUserIds: null,
            deletedForEveryone: false,
            pinnedByUserIds: null,
            starredByUserIds: null,
            replyToMessageId: null,
            editedAt: null
        };
    }
    async assertConversationAccess(conversationId, userId) {
        const match = await this.matchRepo.findOne({
            where: {
                id: conversationId
            }
        });
        if (!match) throw new _common.NotFoundException('Conversation not found.');
        if (match.senderId !== userId && match.receiverId !== userId) {
            throw new _common.ForbiddenException('You are not part of this conversation.');
        }
        if (match.status !== _matchentity.MatchStatus.MATCHED) {
            throw new _common.ForbiddenException('Messages are available only after both users match.');
        }
        const { limits } = await this.planUsage.get(userId);
        if (limits.matches !== Number.MAX_SAFE_INTEGER) {
            const unlockedRows = await this.matchRepo.createQueryBuilder('candidate').select([
                'candidate.id'
            ]).where('(candidate.senderId = :userId OR candidate.receiverId = :userId)', {
                userId
            }).andWhere('candidate.status = :status', {
                status: _matchentity.MatchStatus.MATCHED
            }).andWhere(`COALESCE(candidate.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')`).orderBy('candidate.updatedAt', 'ASC').addOrderBy('candidate.id', 'ASC').take(limits.matches).getMany();
            if (!unlockedRows.some((candidate)=>candidate.id === match.id)) {
                throw new _common.ForbiddenException(`This match is locked. Your plan allows ${limits.matches} active matches. Upgrade your plan to unlock it.`);
            }
        }
        return match;
    }
    parseUserList(value) {
        if (!value) return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch  {
            return [];
        }
    }
    isMan(gender) {
        return [
            'male',
            'man',
            'men',
            'boy',
            'm'
        ].includes(String(gender || '').trim().toLowerCase());
    }
    /** The original First Impression sender needs an active paid plan to read a woman's reply. */ async shouldLockFirstImpressionReply(viewerId, senderId) {
        if (senderId === viewerId) return false;
        const [viewer, impression] = await Promise.all([
            this.userRepo.findOne({
                where: {
                    id: viewerId
                },
                select: [
                    'id',
                    'gender',
                    'plan',
                    'planExpiresAt'
                ]
            }),
            this.firstImpressionRepo.findOne({
                where: {
                    senderId: viewerId,
                    receiverId: senderId
                }
            })
        ]);
        if (!viewer || !impression || !this.isMan(viewer.gender)) return false;
        const hasActivePlan = viewer.plan !== 'free' && (!viewer.planExpiresAt || viewer.planExpiresAt > new Date());
        return !hasActivePlan;
    }
    async forViewer(message, viewerId) {
        if (message.content.startsWith(CALL_LOG_PREFIX)) return message;
        if (!await this.shouldLockFirstImpressionReply(viewerId, message.senderId)) return message;
        return {
            ...message,
            content: 'Unlock your plan to read her reply.',
            lockedForPlan: true
        };
    }
    async upsertCallLog(call) {
        const content = CALL_LOG_PREFIX + JSON.stringify({
            callId: call.id,
            callType: call.callType,
            status: call.status,
            callerId: call.callerId,
            receiverId: call.receiverId,
            placedAt: call.createdAt,
            startedAt: call.startedAt,
            endedAt: call.endedAt
        });
        const existing = await this.msgRepo.findOne({
            where: {
                id: call.id
            }
        });
        if (existing) {
            existing.content = content;
            return this.msgRepo.save(existing);
        }
        return this.msgRepo.save(this.msgRepo.create({
            id: call.id,
            conversationId: call.conversationId,
            senderId: call.callerId,
            receiverId: call.receiverId,
            content,
            createdAt: call.createdAt
        }));
    }
    async assertMessageAccess(messageId, userId) {
        const msg = await this.msgRepo.findOne({
            where: {
                id: messageId
            }
        });
        if (!msg) throw new _common.NotFoundException('Message not found.');
        await this.assertConversationAccess(msg.conversationId, userId);
        if (msg.senderId !== userId && msg.receiverId !== userId) {
            throw new _common.ForbiddenException('You are not part of this message.');
        }
        return msg;
    }
    async findAll(conversationId, userId, requestedLimit = 50, before) {
        await this.assertConversationAccess(conversationId, userId);
        const limit = Math.min(100, Math.max(1, Math.floor(requestedLimit)));
        const beforeDate = before ? new Date(before) : null;
        const hasValidCursor = !!beforeDate && !Number.isNaN(beforeDate.getTime());
        try {
            const messages = await this.msgRepo.find({
                where: hasValidCursor ? {
                    conversationId,
                    createdAt: (0, _typeorm1.LessThan)(beforeDate)
                } : {
                    conversationId
                },
                order: {
                    createdAt: 'DESC'
                },
                take: limit
            });
            const visible = messages.filter((message)=>!this.parseUserList(message.deletedForUserIds).includes(userId)).reverse();
            return Promise.all(visible.map((message)=>this.forViewer(message, userId)));
        } catch (error) {
            if (!this.isOptionalMessageSchemaMismatch(error)) throw error;
            const cursorSql = hasValidCursor ? ' AND createdAt < ?' : '';
            const params = hasValidCursor ? [
                conversationId,
                beforeDate,
                limit
            ] : [
                conversationId,
                limit
            ];
            const rows = await this.msgRepo.query(`SELECT id, conversationId, senderId, receiverId, content, isRead, createdAt FROM messages WHERE conversationId = ?${cursorSql} ORDER BY createdAt DESC LIMIT ?`, params);
            return Promise.all(rows.reverse().map((row)=>this.forViewer(this.normalizeCoreMessage(row), userId)));
        }
    }
    async create(conversationId, senderId, receiverId, content, replyToMessageId) {
        const match = await this.assertConversationAccess(conversationId, senderId);
        const validReceiver = receiverId === match.senderId || receiverId === match.receiverId;
        if (!validReceiver || receiverId === senderId) {
            throw new _common.ForbiddenException('Invalid receiver for this conversation.');
        }
        if (replyToMessageId) {
            const replyMessage = await this.assertMessageAccess(replyToMessageId, senderId);
            if (replyMessage.conversationId !== conversationId) {
                throw new _common.ForbiddenException('Reply message is not in this conversation.');
            }
        }
        const { limits } = await this.planUsage.get(senderId);
        if (content.startsWith('__voice_message__:') && !limits.voiceMessages) {
            throw new _common.ForbiddenException('Voice messages are not included in the Free plan. Upgrade to continue.');
        }
        if (content.startsWith('__photo_message__:') || content.startsWith('__video_message__:')) {
            await this.planUsage.assertAndRecord(senderId, 'sharedImagesPerMonth', 'Media sharing', receiverId);
        }
        if (limits.messagesPerUser !== null) {
            const sent = await this.msgRepo.count({
                where: {
                    senderId,
                    receiverId
                }
            });
            if (sent >= limits.messagesPerUser) {
                throw new _common.BadRequestException(`Free plan allows ${limits.messagesPerUser} messages to each match. Upgrade for unlimited messages.`);
            }
        }
        const msg = this.msgRepo.create({
            conversationId,
            senderId,
            receiverId,
            content,
            replyToMessageId: replyToMessageId || null
        });
        try {
            const savedMessage = await this.msgRepo.save(msg);
            this.queueMessagePush(savedMessage);
            return savedMessage;
        } catch (error) {
            if (!this.isOptionalMessageSchemaMismatch(error)) throw error;
            const id = (0, _crypto.randomUUID)();
            await this.msgRepo.query('INSERT INTO messages (id, conversationId, senderId, receiverId, content, isRead, createdAt) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP(6))', [
                id,
                conversationId,
                senderId,
                receiverId,
                content
            ]);
            const rows = await this.msgRepo.query('SELECT id, conversationId, senderId, receiverId, content, isRead, createdAt FROM messages WHERE id = ? LIMIT 1', [
                id
            ]);
            const savedMessage = this.normalizeCoreMessage(rows[0]);
            this.queueMessagePush(savedMessage);
            return savedMessage;
        }
    }
    async remove(id, userId, scope = 'everyone') {
        const msg = await this.assertMessageAccess(id, userId);
        if (scope === 'everyone') {
            if (msg.senderId !== userId) {
                throw new _common.ForbiddenException('Only the sender can delete this message for everyone.');
            }
            const deleteForEveryoneWindowMs = 10 * 60 * 1000;
            if (Date.now() - new Date(msg.createdAt).getTime() > deleteForEveryoneWindowMs) {
                throw new _common.ForbiddenException('Delete for everyone is only available for 10 minutes.');
            }
            msg.deletedForEveryone = true;
            msg.content = 'This message was deleted';
            msg.reactions = null;
        } else {
            const deletedFor = new Set(this.parseUserList(msg.deletedForUserIds));
            deletedFor.add(userId);
            msg.deletedForUserIds = JSON.stringify([
                ...deletedFor
            ]);
        }
        return this.msgRepo.save(msg);
    }
    async markAsRead(conversationId, userId) {
        await this.assertConversationAccess(conversationId, userId);
        let unreadMessages;
        try {
            unreadMessages = await this.msgRepo.find({
                where: {
                    conversationId,
                    receiverId: userId,
                    isRead: false
                }
            });
        } catch (error) {
            if (!this.isOptionalMessageSchemaMismatch(error)) throw error;
            const rows = await this.msgRepo.query('SELECT id, conversationId, senderId, receiverId, content, isRead, createdAt FROM messages WHERE conversationId = ? AND receiverId = ? AND isRead = 0', [
                conversationId,
                userId
            ]);
            unreadMessages = rows.map((row)=>this.normalizeCoreMessage(row));
        }
        if (unreadMessages.length === 0) return [];
        await this.msgRepo.update({
            conversationId,
            receiverId: userId,
            isRead: false
        }, {
            isRead: true
        });
        return unreadMessages.map((message)=>({
                ...message,
                isRead: true
            }));
    }
    async toggleReaction(messageId, userId, emoji) {
        const msg = await this.assertMessageAccess(messageId, userId);
        if (msg.deletedForEveryone) throw new _common.ForbiddenException('Cannot react to a deleted message.');
        let reactionsMap = {};
        if (msg.reactions) {
            try {
                reactionsMap = JSON.parse(msg.reactions);
            } catch (e) {
                reactionsMap = {};
            }
        }
        // A user can keep exactly one reaction on a message. Selecting another
        // emoji replaces the previous one instead of creating multiple reactions.
        for (const [reactionEmoji, userIds] of Object.entries(reactionsMap)){
            reactionsMap[reactionEmoji] = Array.isArray(userIds) ? userIds.map(String).filter((id)=>id !== userId) : [];
            if (reactionsMap[reactionEmoji].length === 0) delete reactionsMap[reactionEmoji];
        }
        reactionsMap[emoji] = [
            ...new Set([
                ...(reactionsMap[emoji] || []).map(String),
                userId
            ])
        ];
        msg.reactions = JSON.stringify(reactionsMap);
        await this.msgRepo.save(msg);
        return reactionsMap;
    }
    async clearConversation(conversationId, userId) {
        const match = await this.assertConversationAccess(conversationId, userId);
        const messages = await this.msgRepo.find({
            where: {
                conversationId
            }
        });
        await Promise.all(messages.map((message)=>{
            const deletedFor = new Set(this.parseUserList(message.deletedForUserIds));
            deletedFor.add(userId);
            message.deletedForUserIds = JSON.stringify([
                ...deletedFor
            ]);
            return this.msgRepo.save(message);
        }));
        const hiddenFor = new Set(this.parseUserList(match.hiddenFromChatForUserIds));
        hiddenFor.add(userId);
        match.hiddenFromChatForUserIds = JSON.stringify([
            ...hiddenFor
        ]);
        await this.matchRepo.save(match);
    }
    async removeMany(ids, userId) {
        const messages = await this.msgRepo.find({
            where: [
                {
                    id: (0, _typeorm1.In)(ids),
                    senderId: userId
                },
                {
                    id: (0, _typeorm1.In)(ids),
                    receiverId: userId
                }
            ]
        });
        if (messages.length > 0) {
            await Promise.all(messages.map((message)=>{
                const deletedFor = new Set(this.parseUserList(message.deletedForUserIds));
                deletedFor.add(userId);
                message.deletedForUserIds = JSON.stringify([
                    ...deletedFor
                ]);
                return this.msgRepo.save(message);
            }));
        }
    }
    async update(id, userId, newContent) {
        const msg = await this.assertMessageAccess(id, userId);
        if (msg.senderId !== userId) {
            throw new _common.ForbiddenException('You can only edit your own messages.');
        }
        if (msg.deletedForEveryone) throw new _common.ForbiddenException('Cannot edit a deleted message.');
        msg.content = newContent;
        msg.editedAt = new Date();
        return this.msgRepo.save(msg);
    }
    async togglePin(id, userId) {
        const msg = await this.assertMessageAccess(id, userId);
        const pinnedBy = new Set(this.parseUserList(msg.pinnedByUserIds));
        if (pinnedBy.has(userId)) pinnedBy.delete(userId);
        else pinnedBy.add(userId);
        msg.pinnedByUserIds = JSON.stringify([
            ...pinnedBy
        ]);
        return this.msgRepo.save(msg);
    }
    async toggleStar(id, userId) {
        const msg = await this.assertMessageAccess(id, userId);
        const starredBy = new Set(this.parseUserList(msg.starredByUserIds));
        if (starredBy.has(userId)) starredBy.delete(userId);
        else starredBy.add(userId);
        msg.starredByUserIds = JSON.stringify([
            ...starredBy
        ]);
        return this.msgRepo.save(msg);
    }
    async getInfo(id, userId) {
        return this.assertMessageAccess(id, userId);
    }
    constructor(msgRepo, matchRepo, userRepo, firstImpressionRepo, pushNotifications, planUsage){
        this.msgRepo = msgRepo;
        this.matchRepo = matchRepo;
        this.userRepo = userRepo;
        this.firstImpressionRepo = firstImpressionRepo;
        this.pushNotifications = pushNotifications;
        this.planUsage = planUsage;
        this.logger = new _common.Logger(MessagesService.name);
    }
};
MessagesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_messageentity.Message)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_firstimpressionentity.FirstImpression)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _pushnotificationsservice.PushNotificationsService === "undefined" ? Object : _pushnotificationsservice.PushNotificationsService,
        typeof _planusageservice.PlanUsageService === "undefined" ? Object : _planusageservice.PlanUsageService
    ])
], MessagesService);

//# sourceMappingURL=messages.service.js.map