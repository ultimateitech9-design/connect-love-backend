"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MessagesController", {
    enumerable: true,
    get: function() {
        return MessagesController;
    }
});
const _common = require("@nestjs/common");
const _messagesservice = require("./messages.service");
const _passport = require("@nestjs/passport");
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
let MessagesController = class MessagesController {
    async batchDelete(req, messageIds) {
        await this.messagesService.removeMany(messageIds, req.user.userId);
        return {
            success: true
        };
    }
    async messageInfo(req, id) {
        return this.messagesService.getInfo(id, req.user.userId);
    }
    async getConversationMessages(req, conversationId, limit, before) {
        return this.messagesService.findAll(conversationId, req.user.userId, Number(limit) || 50, before);
    }
    async createMessage(req, conversationId, receiverId, text, content, replyToMessageId) {
        return this.messagesService.create(conversationId, req.user.userId, receiverId, content || text, replyToMessageId);
    }
    async deleteMessage(req, id, scope) {
        return this.messagesService.remove(id, req.user.userId, scope || 'me');
    }
    async deleteMessageAction(req, id, scope) {
        return this.messagesService.remove(id, req.user.userId, scope || 'me');
    }
    async clearConversation(req, conversationId) {
        await this.messagesService.clearConversation(conversationId, req.user.userId);
        return {
            success: true
        };
    }
    async editMessage(req, id, content) {
        return this.messagesService.update(id, req.user.userId, content);
    }
    async togglePin(req, id) {
        return this.messagesService.togglePin(id, req.user.userId);
    }
    async toggleStar(req, id) {
        return this.messagesService.toggleStar(id, req.user.userId);
    }
    async toggleReaction(req, id, emoji) {
        return this.messagesService.toggleReaction(id, req.user.userId, emoji);
    }
    async markAsRead(req, conversationId) {
        await this.messagesService.markAsRead(conversationId, req.user.userId);
        return {
            success: true
        };
    }
    constructor(messagesService){
        this.messagesService = messagesService;
    }
};
_ts_decorate([
    (0, _common.Post)('batch-delete'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)('messageIds')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        Array
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "batchDelete", null);
_ts_decorate([
    (0, _common.Get)(':id/info'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "messageInfo", null);
_ts_decorate([
    (0, _common.Get)(':conversationId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('conversationId')),
    _ts_param(2, (0, _common.Query)('limit')),
    _ts_param(3, (0, _common.Query)('before')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "getConversationMessages", null);
_ts_decorate([
    (0, _common.Post)(':conversationId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('conversationId')),
    _ts_param(2, (0, _common.Body)('receiverId')),
    _ts_param(3, (0, _common.Body)('text')),
    _ts_param(4, (0, _common.Body)('content')),
    _ts_param(5, (0, _common.Body)('replyToMessageId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "createMessage", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('scope')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "deleteMessage", null);
_ts_decorate([
    (0, _common.Post)(':id/delete'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('scope')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "deleteMessageAction", null);
_ts_decorate([
    (0, _common.Delete)('conversation/:conversationId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('conversationId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "clearConversation", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('content')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "editMessage", null);
_ts_decorate([
    (0, _common.Patch)(':id/pin'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "togglePin", null);
_ts_decorate([
    (0, _common.Patch)(':id/star'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "toggleStar", null);
_ts_decorate([
    (0, _common.Patch)(':id/reaction'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('emoji')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "toggleReaction", null);
_ts_decorate([
    (0, _common.Patch)(':conversationId/read'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('conversationId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesController.prototype, "markAsRead", null);
MessagesController = _ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Controller)('messages'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _messagesservice.MessagesService === "undefined" ? Object : _messagesservice.MessagesService
    ])
], MessagesController);

//# sourceMappingURL=messages.controller.js.map