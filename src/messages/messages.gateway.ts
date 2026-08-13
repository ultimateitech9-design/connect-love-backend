import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { VideoCallsService } from './video-calls.service';
import { UsersService } from '../users/users.service';
import { MatchesService } from '../matches/matches.service';
import { MatchStatus } from '../matches/match.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 12 * 1024 * 1024,
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map to store connected users: userId -> Set of socketIds
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly videoCallsService: VideoCallsService,
    private readonly usersService: UsersService,
    private readonly matchesService: MatchesService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserIdForSocket(client: Socket): string | undefined {
    for (const [userId, sockets] of this.connectedUsers.entries()) {
      if (sockets.has(client.id)) return userId;
    }
    return undefined;
  }

  private emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private isUserOnline(userId: string): boolean {
    return !!this.connectedUsers.get(userId)?.size;
  }

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth?.token || client.handshake.query.token) as string | undefined;
    let userId: string | undefined;

    try {
      if (!token) throw new Error('Missing socket token');
      const jwtSecret = process.env.JWT_SECRET?.trim();
      if (!jwtSecret) throw new Error('JWT_SECRET must be configured in .env');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });
      userId = payload.sub || payload.userId;
    } catch {
      client.disconnect(true);
      return;
    }

    if (userId) {
      await client.join(`user:${userId}`);
      const userSockets = this.connectedUsers.get(userId);
      if (!userSockets || userSockets.size === 0) {
        this.connectedUsers.set(userId, new Set([client.id]));
        await this.usersService.updatePresence(userId, true);
        await this.broadcastPresenceToMatches(userId, true);
      } else {
        userSockets.add(client.id);
      }
    }
  }

  async handleDisconnect(client: Socket) {
    let disconnectedUserId: string | null = null;
    for (const [userId, sockets] of this.connectedUsers.entries()) {
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

  private async broadcastPresenceToMatches(userId: string, isOnline: boolean, lastSeen?: Date) {
    try {
      const activeMatches = await this.matchesService.findAllByStatus(userId, MatchStatus.MATCHED);
      const payload = { userId, isOnline, lastSeen };

      activeMatches.forEach(match => {
        const otherId = match.senderId === userId ? match.receiverId : match.senderId;
        const otherSockets = this.connectedUsers.get(otherId);
        if (otherSockets) {
          for (const socketId of otherSockets) {
            this.server.to(socketId).emit('USER_STATUS_CHANGED', payload);
          }
        }
      });
    } catch (error) {
      console.error('Error broadcasting presence', error);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; receiverId: string; content: string; replyToMessageId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = this.getUserIdForSocket(client);
    if (!senderId) return { error: 'Not authenticated' };

    let savedMessage;
    try {
      savedMessage = await this.messagesService.create(data.conversationId, senderId, data.receiverId, data.content, data.replyToMessageId);
    } catch (error: any) {
      return { error: error?.message || 'Could not send message' };
    }

    const messageForSender = {
      ...savedMessage,
      deliveryStatus: this.isUserOnline(data.receiverId) ? 'delivered' : 'sent',
    };

    // Emit to recipient if online
    this.emitToUser(data.receiverId, 'receiveMessage', savedMessage);
    
    // Emit back to sender (optional, can be optimistic on client)
    this.server.to(client.id).emit('receiveMessage', messageForSender);

    return { event: 'messageSent', data: messageForSender };
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; receiverId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdForSocket(client);
    if (!userId) return { error: 'Not authenticated' };

    try {
      const message = await this.messagesService.update(data.messageId, userId, data.content);
      this.emitToUser(data.receiverId, 'messageUpdated', message);
      this.server.to(client.id).emit('messageUpdated', message);
      return { event: 'messageUpdated', data: message };
    } catch (error: any) {
      return { error: error?.message || 'Could not edit message' };
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string; receiverId: string; scope?: 'me' | 'everyone' },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdForSocket(client);
    if (!userId) return { error: 'Not authenticated' };

    try {
      const scope = data.scope || 'me';
      const message = await this.messagesService.remove(data.messageId, userId, scope);
      const payload = { message, scope, userId };
      if (scope === 'everyone') this.emitToUser(data.receiverId, 'messageDeleted', payload);
      this.server.to(client.id).emit('messageDeleted', payload);
      return { event: 'messageDeleted', data: payload };
    } catch (error: any) {
      return { error: error?.message || 'Could not delete message' };
    }
  }

  @SubscribeMessage('togglePin')
  async handleTogglePin(
    @MessageBody() data: { messageId: string; receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdForSocket(client);
    if (!userId) return { error: 'Not authenticated' };

    try {
      const message = await this.messagesService.togglePin(data.messageId, userId);
      this.server.to(client.id).emit('messageMetaChanged', message);
      return { event: 'messageMetaChanged', data: message };
    } catch (error: any) {
      return { error: error?.message || 'Could not pin message' };
    }
  }

  @SubscribeMessage('toggleStar')
  async handleToggleStar(
    @MessageBody() data: { messageId: string; receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdForSocket(client);
    if (!userId) return { error: 'Not authenticated' };

    try {
      const message = await this.messagesService.toggleStar(data.messageId, userId);
      this.server.to(client.id).emit('messageMetaChanged', message);
      return { event: 'messageMetaChanged', data: message };
    } catch (error: any) {
      return { error: error?.message || 'Could not star message' };
    }
  }

  @SubscribeMessage('toggleReaction')
  async handleToggleReaction(
    @MessageBody() data: { messageId: string; conversationId: string; receiverId: string; emoji: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdForSocket(client);
    if (!userId) return { error: 'Not authenticated' };

    try {
      const updatedReactions = await this.messagesService.toggleReaction(data.messageId, userId, data.emoji);
      const payload = { messageId: data.messageId, conversationId: data.conversationId, reactions: updatedReactions };

      // Emit messageReactionChanged to both receiver and sender
      this.emitToUser(data.receiverId, 'messageReactionChanged', payload);
      this.server.to(client.id).emit('messageReactionChanged', payload);

      return { event: 'reactionToggled', data: payload };
    } catch (error: any) {
      return { error: error?.message || 'Could not toggle reaction' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId?: string; receiverId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = this.getUserIdForSocket(client);
    if (!senderId) return { error: 'Not authenticated' };

    this.emitToUser(data.receiverId, 'typingStatus', {
      conversationId: data.conversationId,
      userId: senderId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('recording')
  handleRecording(
    @MessageBody() data: { conversationId?: string; receiverId: string; isRecording: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = this.getUserIdForSocket(client);
    if (!senderId) return { error: 'Not authenticated' };

    this.emitToUser(data.receiverId, 'recordingStatus', {
      conversationId: data.conversationId,
      userId: senderId,
      isRecording: data.isRecording,
    });
  }

  @SubscribeMessage('markMessagesRead')
  async handleMarkMessagesRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const readerId = this.getUserIdForSocket(client);
    if (!readerId) return { error: 'Not authenticated' };

    try {
      const readMessages = await this.messagesService.markAsRead(data.conversationId, readerId);
      const payload = {
        conversationId: data.conversationId,
        readerId,
        messageIds: readMessages.map((message) => message.id),
      };

      const senderIds = new Set(readMessages.map((message) => message.senderId));
      senderIds.forEach((senderId) => this.emitToUser(senderId, 'messagesRead', payload));
      this.server.to(client.id).emit('messagesRead', payload);

      return { event: 'messagesRead', data: payload };
    } catch (error: any) {
      return { error: error?.message || 'Could not mark messages as read' };
    }
  }

  @SubscribeMessage('startVideoCall')
  async handleStartVideoCall(
    @MessageBody() data: { conversationId: string; receiverId: string; callType?: 'audio' | 'video' },
    @ConnectedSocket() client: Socket,
  ) {
    const callerId = this.getUserIdForSocket(client);
    if (!callerId) return { error: 'Not authenticated' };

    try {
      const callType = data.callType === 'audio' ? 'audio' : 'video';
      const call = await this.videoCallsService.start(data.conversationId, callerId, data.receiverId, callType);
      const payload = { call, callerId, conversationId: data.conversationId, callType };
      this.emitToUser(data.receiverId, 'incomingVideoCall', payload);
      this.server.to(client.id).emit('videoCallStarted', payload);
      return { event: 'videoCallStarted', data: payload };
    } catch (error: any) {
      return { error: error?.message || 'Could not start call' };
    }
  }

  @SubscribeMessage('acceptVideoCall')
  async handleAcceptVideoCall(
    @MessageBody() data: { callId: string; callerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const receiverId = this.getUserIdForSocket(client);
    if (!receiverId) return { error: 'Not authenticated' };

    try {
      const call = await this.videoCallsService.accept(data.callId, receiverId);
      const maxDurationMinutes = call.callType === 'video' ? await this.videoCallsService.durationMinutesForCaller(call.callerId) : null;
      const payload = { call, receiverId, maxDurationMinutes };
      this.emitToUser(data.callerId, 'videoCallAccepted', payload);
      this.server.to(client.id).emit('videoCallAccepted', payload);
      if (maxDurationMinutes) {
        setTimeout(() => {
          void this.videoCallsService.finish(call.id, call.callerId, 'ended').then((endedCall) => {
            const endedPayload = { call: endedCall, endedBy: 'plan_limit' };
            this.emitToUser(call.callerId, 'videoCallEnded', endedPayload);
            this.emitToUser(call.receiverId, 'videoCallEnded', endedPayload);
          }).catch(() => undefined);
        }, maxDurationMinutes * 60_000);
      }
      return { event: 'videoCallAccepted', data: payload };
    } catch (error: any) {
      return { error: error?.message || 'Could not accept call' };
    }
  }

  @SubscribeMessage('endVideoCall')
  async handleEndVideoCall(
    @MessageBody() data: { callId: string; otherUserId: string; status?: 'ended' | 'rejected' | 'missed' },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdForSocket(client);
    if (!userId) return { error: 'Not authenticated' };

    try {
      const call = await this.videoCallsService.finish(data.callId, userId, data.status || 'ended');
      const payload = { call, endedBy: userId };
      this.emitToUser(data.otherUserId, 'videoCallEnded', payload);
      this.server.to(client.id).emit('videoCallEnded', payload);
      return { event: 'videoCallEnded', data: payload };
    } catch (error: any) {
      return { error: error?.message || 'Could not end call' };
    }
  }

  @SubscribeMessage('videoSignal')
  handleVideoSignal(
    @MessageBody() data: { receiverId: string; callId: string; signalType: 'offer' | 'answer' | 'ice'; payload: unknown },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = this.getUserIdForSocket(client);
    if (!senderId) return { error: 'Not authenticated' };

    this.emitToUser(data.receiverId, 'videoSignal', {
      callId: data.callId,
      senderId,
      signalType: data.signalType,
      payload: data.payload,
    });
  }
}
