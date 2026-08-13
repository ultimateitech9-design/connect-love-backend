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
const _videocallsservice = require("./video-calls.service");
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
    getUserIdForSocket(client) {
        for (const [userId, sockets] of this.connectedUsers.entries()){
            if (sockets.has(client.id)) return userId;
        }
        return undefined;
    }
    emitToUser(userId, event, payload) {
        this.server.to(`user:${userId}`).emit(event, payload);
    }
    isUserOnline(userId) {
        return !!this.connectedUsers.get(userId)?.size;
    }
    async handleConnection(client) {
        const token = client.handshake.auth?.token || client.handshake.query.token;
        let userId;
        try {
            if (!token) throw new Error('Missing socket token');
            const jwtSecret = process.env.JWT_SECRET?.trim();
            if (!jwtSecret) throw new Error('JWT_SECRET must be configured in .env');
            const payload = await this.jwtService.verifyAsync(token, {
                secret: jwtSecret
            });
            userId = payload.sub || payload.userId;
        } catch  {
            client.disconnect(true);
            return;
        }
        if (userId) {
            await client.join(`user:${userId}`);
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
        const senderId = this.getUserIdForSocket(client);
        if (!senderId) return {
            error: 'Not authenticated'
        };
        let savedMessage;
        try {
            savedMessage = await this.messagesService.create(data.conversationId, senderId, data.receiverId, data.content, data.replyToMessageId);
        } catch (error) {
            return {
                error: error?.message || 'Could not send message'
            };
        }
        const messageForSender = {
            ...savedMessage,
            deliveryStatus: this.isUserOnline(data.receiverId) ? 'delivered' : 'sent'
        };
        // Emit to recipient if online
        this.emitToUser(data.receiverId, 'receiveMessage', savedMessage);
        // Emit back to sender (optional, can be optimistic on client)
        this.server.to(client.id).emit('receiveMessage', messageForSender);
        return {
            event: 'messageSent',
            data: messageForSender
        };
    }
    async handleEditMessage(data, client) {
        const userId = this.getUserIdForSocket(client);
        if (!userId) return {
            error: 'Not authenticated'
        };
        try {
            const message = await this.messagesService.update(data.messageId, userId, data.content);
            this.emitToUser(data.receiverId, 'messageUpdated', message);
            this.server.to(client.id).emit('messageUpdated', message);
            return {
                event: 'messageUpdated',
                data: message
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not edit message'
            };
        }
    }
    async handleDeleteMessage(data, client) {
        const userId = this.getUserIdForSocket(client);
        if (!userId) return {
            error: 'Not authenticated'
        };
        try {
            const scope = data.scope || 'me';
            const message = await this.messagesService.remove(data.messageId, userId, scope);
            const payload = {
                message,
                scope,
                userId
            };
            if (scope === 'everyone') this.emitToUser(data.receiverId, 'messageDeleted', payload);
            this.server.to(client.id).emit('messageDeleted', payload);
            return {
                event: 'messageDeleted',
                data: payload
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not delete message'
            };
        }
    }
    async handleTogglePin(data, client) {
        const userId = this.getUserIdForSocket(client);
        if (!userId) return {
            error: 'Not authenticated'
        };
        try {
            const message = await this.messagesService.togglePin(data.messageId, userId);
            this.server.to(client.id).emit('messageMetaChanged', message);
            return {
                event: 'messageMetaChanged',
                data: message
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not pin message'
            };
        }
    }
    async handleToggleStar(data, client) {
        const userId = this.getUserIdForSocket(client);
        if (!userId) return {
            error: 'Not authenticated'
        };
        try {
            const message = await this.messagesService.toggleStar(data.messageId, userId);
            this.server.to(client.id).emit('messageMetaChanged', message);
            return {
                event: 'messageMetaChanged',
                data: message
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not star message'
            };
        }
    }
    async handleToggleReaction(data, client) {
        const userId = this.getUserIdForSocket(client);
        if (!userId) return {
            error: 'Not authenticated'
        };
        try {
            const updatedReactions = await this.messagesService.toggleReaction(data.messageId, userId, data.emoji);
            const payload = {
                messageId: data.messageId,
                conversationId: data.conversationId,
                reactions: updatedReactions
            };
            // Emit messageReactionChanged to both receiver and sender
            this.emitToUser(data.receiverId, 'messageReactionChanged', payload);
            this.server.to(client.id).emit('messageReactionChanged', payload);
            return {
                event: 'reactionToggled',
                data: payload
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not toggle reaction'
            };
        }
    }
    handleTyping(data, client) {
        const senderId = this.getUserIdForSocket(client);
        if (!senderId) return {
            error: 'Not authenticated'
        };
        this.emitToUser(data.receiverId, 'typingStatus', {
            conversationId: data.conversationId,
            userId: senderId,
            isTyping: data.isTyping
        });
    }
    handleRecording(data, client) {
        const senderId = this.getUserIdForSocket(client);
        if (!senderId) return {
            error: 'Not authenticated'
        };
        this.emitToUser(data.receiverId, 'recordingStatus', {
            conversationId: data.conversationId,
            userId: senderId,
            isRecording: data.isRecording
        });
    }
    async handleMarkMessagesRead(data, client) {
        const readerId = this.getUserIdForSocket(client);
        if (!readerId) return {
            error: 'Not authenticated'
        };
        try {
            const readMessages = await this.messagesService.markAsRead(data.conversationId, readerId);
            const payload = {
                conversationId: data.conversationId,
                readerId,
                messageIds: readMessages.map((message)=>message.id)
            };
            const senderIds = new Set(readMessages.map((message)=>message.senderId));
            senderIds.forEach((senderId)=>this.emitToUser(senderId, 'messagesRead', payload));
            this.server.to(client.id).emit('messagesRead', payload);
            return {
                event: 'messagesRead',
                data: payload
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not mark messages as read'
            };
        }
    }
    async handleStartVideoCall(data, client) {
        const callerId = this.getUserIdForSocket(client);
        if (!callerId) return {
            error: 'Not authenticated'
        };
        try {
            const callType = data.callType === 'audio' ? 'audio' : 'video';
            const call = await this.videoCallsService.start(data.conversationId, callerId, data.receiverId, callType);
            const payload = {
                call,
                callerId,
                conversationId: data.conversationId,
                callType
            };
            this.emitToUser(data.receiverId, 'incomingVideoCall', payload);
            this.server.to(client.id).emit('videoCallStarted', payload);
            return {
                event: 'videoCallStarted',
                data: payload
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not start call'
            };
        }
    }
    async handleAcceptVideoCall(data, client) {
        const receiverId = this.getUserIdForSocket(client);
        if (!receiverId) return {
            error: 'Not authenticated'
        };
        try {
            const call = await this.videoCallsService.accept(data.callId, receiverId);
            const maxDurationMinutes = call.callType === 'video' ? await this.videoCallsService.durationMinutesForCaller(call.callerId) : null;
            const payload = {
                call,
                receiverId,
                maxDurationMinutes
            };
            this.emitToUser(data.callerId, 'videoCallAccepted', payload);
            this.server.to(client.id).emit('videoCallAccepted', payload);
            if (maxDurationMinutes) {
                setTimeout(()=>{
                    void this.videoCallsService.finish(call.id, call.callerId, 'ended').then((endedCall)=>{
                        const endedPayload = {
                            call: endedCall,
                            endedBy: 'plan_limit'
                        };
                        this.emitToUser(call.callerId, 'videoCallEnded', endedPayload);
                        this.emitToUser(call.receiverId, 'videoCallEnded', endedPayload);
                    }).catch(()=>undefined);
                }, maxDurationMinutes * 60_000);
            }
            return {
                event: 'videoCallAccepted',
                data: payload
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not accept call'
            };
        }
    }
    async handleEndVideoCall(data, client) {
        const userId = this.getUserIdForSocket(client);
        if (!userId) return {
            error: 'Not authenticated'
        };
        try {
            const call = await this.videoCallsService.finish(data.callId, userId, data.status || 'ended');
            const payload = {
                call,
                endedBy: userId
            };
            this.emitToUser(data.otherUserId, 'videoCallEnded', payload);
            this.server.to(client.id).emit('videoCallEnded', payload);
            return {
                event: 'videoCallEnded',
                data: payload
            };
        } catch (error) {
            return {
                error: error?.message || 'Could not end call'
            };
        }
    }
    handleVideoSignal(data, client) {
        const senderId = this.getUserIdForSocket(client);
        if (!senderId) return {
            error: 'Not authenticated'
        };
        this.emitToUser(data.receiverId, 'videoSignal', {
            callId: data.callId,
            senderId,
            signalType: data.signalType,
            payload: data.payload
        });
    }
    constructor(messagesService, videoCallsService, usersService, matchesService, jwtService){
        this.messagesService = messagesService;
        this.videoCallsService = videoCallsService;
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
    (0, _websockets.SubscribeMessage)('editMessage'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleEditMessage", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('deleteMessage'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleDeleteMessage", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('togglePin'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleTogglePin", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('toggleStar'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleToggleStar", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('toggleReaction'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleToggleReaction", null);
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
_ts_decorate([
    (0, _websockets.SubscribeMessage)('recording'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleRecording", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('markMessagesRead'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleMarkMessagesRead", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('startVideoCall'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleStartVideoCall", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('acceptVideoCall'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleAcceptVideoCall", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('endVideoCall'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", Promise)
], MessagesGateway.prototype, "handleEndVideoCall", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('videoSignal'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_param(1, (0, _websockets.ConnectedSocket)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket
    ]),
    _ts_metadata("design:returntype", void 0)
], MessagesGateway.prototype, "handleVideoSignal", null);
MessagesGateway = _ts_decorate([
    (0, _websockets.WebSocketGateway)({
        cors: {
            origin: '*'
        },
        maxHttpBufferSize: 12 * 1024 * 1024,
        pingInterval: 10000,
        pingTimeout: 5000
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _messagesservice.MessagesService === "undefined" ? Object : _messagesservice.MessagesService,
        typeof _videocallsservice.VideoCallsService === "undefined" ? Object : _videocallsservice.VideoCallsService,
        typeof _usersservice.UsersService === "undefined" ? Object : _usersservice.UsersService,
        typeof _matchesservice.MatchesService === "undefined" ? Object : _matchesservice.MatchesService,
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService
    ])
], MessagesGateway);

//# sourceMappingURL=messages.gateway.js.map