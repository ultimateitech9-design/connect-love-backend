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
    async findAll(conversationId, userId) {
        await this.assertConversationAccess(conversationId, userId);
        return this.msgRepo.find({
            where: {
                conversationId
            },
            order: {
                createdAt: 'ASC'
            }
        });
    }
    async create(conversationId, senderId, receiverId, content) {
        const match = await this.assertConversationAccess(conversationId, senderId);
        const validReceiver = receiverId === match.senderId || receiverId === match.receiverId;
        if (!validReceiver || receiverId === senderId) {
            throw new _common.ForbiddenException('Invalid receiver for this conversation.');
        }
        const msg = this.msgRepo.create({
            conversationId,
            senderId,
            receiverId,
            content
        });
        return this.msgRepo.save(msg);
    }
    async remove(id, userId) {
        const msg = await this.msgRepo.findOne({
            where: {
                id
            }
        });
        if (msg && (msg.senderId === userId || msg.receiverId === userId)) {
            await this.msgRepo.remove(msg);
        }
    }
    async markAsRead(conversationId, userId) {
        await this.assertConversationAccess(conversationId, userId);
        await this.msgRepo.update({
            conversationId,
            receiverId: userId,
            isRead: false
        }, {
            isRead: true
        });
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