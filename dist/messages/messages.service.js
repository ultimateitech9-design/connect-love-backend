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
let MessagesService = class MessagesService {
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
    async findAll(conversationId, userId) {
        await this.assertConversationAccess(conversationId, userId);
        try {
            const messages = await this.msgRepo.find({
                where: {
                    conversationId
                },
                order: {
                    createdAt: 'ASC'
                }
            });
            return messages.filter((message)=>!this.parseUserList(message.deletedForUserIds).includes(userId));
        } catch (error) {
            if (!this.isOptionalMessageSchemaMismatch(error)) throw error;
            const rows = await this.msgRepo.query('SELECT id, conversationId, senderId, receiverId, content, isRead, createdAt FROM messages WHERE conversationId = ? ORDER BY createdAt ASC', [
                conversationId
            ]);
            return rows.map((row)=>this.normalizeCoreMessage(row));
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
        const msg = this.msgRepo.create({
            conversationId,
            senderId,
            receiverId,
            content,
            replyToMessageId: replyToMessageId || null
        });
        try {
            return await this.msgRepo.save(msg);
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
            return this.normalizeCoreMessage(rows[0]);
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
        if (!reactionsMap[emoji]) {
            reactionsMap[emoji] = [];
        }
        const index = reactionsMap[emoji].indexOf(userId);
        if (index > -1) {
            reactionsMap[emoji].splice(index, 1);
            if (reactionsMap[emoji].length === 0) {
                delete reactionsMap[emoji];
            }
        } else {
            reactionsMap[emoji].push(userId);
        }
        msg.reactions = JSON.stringify(reactionsMap);
        await this.msgRepo.save(msg);
        return reactionsMap;
    }
    async clearConversation(conversationId, userId) {
        await this.assertConversationAccess(conversationId, userId);
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
    constructor(msgRepo, matchRepo){
        this.msgRepo = msgRepo;
        this.matchRepo = matchRepo;
    }
};
MessagesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_messageentity.Message)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], MessagesService);

//# sourceMappingURL=messages.service.js.map