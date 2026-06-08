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
import { UsersService } from '../users/users.service';
import { MatchesService } from '../matches/matches.service';
import { MatchStatus } from '../matches/match.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
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
    private readonly usersService: UsersService,
    private readonly matchesService: MatchesService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth?.token || client.handshake.query.token) as string | undefined;
    let userId: string | undefined;

    try {
      if (!token) throw new Error('Missing socket token');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'soulmatch_super_secret_key_change_in_production',
      });
      userId = payload.sub || payload.userId;
    } catch {
      client.disconnect(true);
      return;
    }

    if (userId) {
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
    @MessageBody() data: { conversationId: string; receiverId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    let senderId: string | undefined;
    for (const [userId, sockets] of this.connectedUsers.entries()) {
      if (sockets.has(client.id)) {
        senderId = userId;
        break;
      }
    }
    if (!senderId) return { error: 'Not authenticated' };

    let savedMessage;
    try {
      savedMessage = await this.messagesService.create(data.conversationId, senderId, data.receiverId, data.content);
    } catch (error: any) {
      return { error: error?.message || 'Could not send message' };
    }

    // Emit to recipient if online
    const recipientSockets = this.connectedUsers.get(data.receiverId);
    if (recipientSockets) {
      for (const socketId of recipientSockets) {
        this.server.to(socketId).emit('receiveMessage', savedMessage);
      }
    }
    
    // Emit back to sender (optional, can be optimistic on client)
    this.server.to(client.id).emit('receiveMessage', savedMessage);

    return { event: 'messageSent', data: savedMessage };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { receiverId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    let senderId: string | undefined;
    for (const [userId, sockets] of this.connectedUsers.entries()) {
      if (sockets.has(client.id)) {
        senderId = userId;
        break;
      }
    }
    
    const recipientSockets = this.connectedUsers.get(data.receiverId);
    if (recipientSockets) {
      for (const socketId of recipientSockets) {
        this.server.to(socketId).emit('typingStatus', { userId: senderId, isTyping: data.isTyping });
      }
    }
  }
}
