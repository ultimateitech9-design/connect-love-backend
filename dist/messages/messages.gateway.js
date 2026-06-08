"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MessagesGateway", {
    enumerable: true,
    get: function() {
        return MessagesGateway;
    }
});
const _websockets = require("@nestjs/websockets");
const _socketio = require("socket.io");
const _jwt = require("@nestjs/jwt");
const _messagesservice = require("./messages.service");
const _usersservice = require("../users/users.service");
const _matchesservice = require("../matches/matches.service");
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
let MessagesGateway = class MessagesGateway {
    async handleConnection(client) {
        const token = client.handshake.auth?.token || client.handshake.query.token;
        let userId;
        try {
            if (!token) throw new Error('Missing socket token');
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET || 'soulmatch_super_secret_key_change_in_production'
            });
            userId = payload.sub || payload.userId;
        } catch  {
            client.disconnect(true);
            return;
        }
        if (userId) {
            const userSockets = this.connectedUsers.get(userId);
            if (!userSockets || userSockets.size === 0) {
                this.connectedUsers.set(userId, new Set([
                    client.id
                ]));
                await this.usersService.updatePresence(userId, true);
                await this.broadcastPresenceToMatches(userId, true);
            } else {
                userSockets.add(client.id);
            }
        }
    }
    async handleDisconnect(client) {
        let disconnectedUserId = null;
        for (const [userId, sockets] of this.connectedUsers.entries()){
            if (sockets.has(client.id)) {
                sockets.delete(client.id);
                if (sockets.size === 0) {
                    this.connectedUsers.delete(userId);
                    disconnectedUserId = userId;
                }
                break;
            }
        }
        if (disconnectedUserId) {
            const now = new Date();
            await this.usersService.updatePresence(disconnectedUserId, false);
            await this.broadcastPresenceToMatches(disconnectedUserId, false, now);
        }
    }
    async broadcastPresenceToMatches(userId, isOnline, lastSeen) {
        try {
            const activeMatches = await this.matchesService.findAllByStatus(userId, _matchentity.MatchStatus.MATCHED);
            const payload = {
                userId,
                isOnline,
                lastSeen
            };
            activeMatches.forEach((match)=>{
                const otherId = match.senderId === userId ? match.receiverId : match.senderId;
                const otherSockets = this.connectedUsers.get(otherId);
                if (otherSockets) {
                    for (const socketId of otherSockets){
                        this.server.to(socketId).emit('USER_STATUS_CHANGED', payload);
                    }
                }
            });
        } catch (error) {
            console.error('Error broadcasting presence', error);
        }
    }
    async handleSendMessage(data, client) {
        let senderId;
        for (const [userId, sockets] of this.connectedUsers.entries()){
            if (sockets.has(client.id)) {
                senderId = userId;
                break;
            }
        }
        if (!senderId) return {
            error: 'Not authenticated'
        };
        let savedMessage;
        try {
            savedMessage = await this.messagesService.create(data.conversationId, senderId, data.receiverId, data.content);
        } catch (error) {
            return {
                error: error?.message || 'Could not send message'
            };
        }
        // Emit to recipient if online
        const recipientSockets = this.connectedUsers.get(data.receiverId);
        if (recipientSockets) {
            for (const socketId of recipientSockets){
                this.server.to(socketId).emit('receiveMessage', savedMessage);
            }
        }
        // Emit back to sender (optional, can be optimistic on client)
        this.server.to(client.id).emit('receiveMessage', savedMessage);
        return {
            event: 'messageSent',
            data: savedMessage
        };
    }
    handleTyping(data, client) {
        let senderId;
        for (const [userId, sockets] of this.connectedUsers.entries()){
            if (sockets.has(client.id)) {
                senderId = userId;
                break;
            }
        }
        const recipientSockets = this.connectedUsers.get(data.receiverId);
        if (recipientSockets) {
            for (const socketId of recipientSockets){
                this.server.to(socketId).emit('typingStatus', {
                    userId: senderId,
                    isTyping: data.isTyping
                });
            }
        }
    }
    constructor(messagesService, usersService, matchesService, jwtService){
        this.messagesService = messagesService;
        this.usersService = usersService;
        this.matchesService = matchesService;
        this.jwtService = jwtService;
        // Map to store connected users: userId -> Set of socketIds
        this.connectedUsers = new Map();
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], MessagesGateway.prototype, "server", void 0);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('sendMessage'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleSendMessage", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('typing'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleTyping", null);
MessagesGateway = _ts_decorate([
    (0, _websockets.WebSocketGateway)({
        cors: {
            origin: '*'
        },
        pingInterval: 10000,
        pingTimeout: 5000
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _messagesservice.MessagesService === "undefined" ? Object : _messagesservice.MessagesService,
        typeof _usersservice.UsersService === "undefined" ? Object : _usersservice.UsersService,
        typeof _matchesservice.MatchesService === "undefined" ? Object : _matchesservice.MatchesService,
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService
    ])
], MessagesGateway);

//# sourceMappingURL=messages.gateway.js.map