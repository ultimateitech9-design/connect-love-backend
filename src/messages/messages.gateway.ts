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
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { PLAN_CALLS_USED, VideoCallsService } from './video-calls.service';
import { UsersService } from '../users/users.service';
import { MatchesService } from '../matches/matches.service';
import { VideoCall } from './video-call.entity';
import { DirectCallsService, UPGRADE_REQUIRED } from '../direct-calls/direct-calls.service';

/** Grace period before a direct call is ended because a participant went offline. */
const OFFLINE_END_DELAY_MS = 20_000;

/** How long an unanswered call rings before it ends as missed. */
const RING_SECONDS = 45;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 12 * 1024 * 1024,
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly visitorChanged = (ownerId: string) => {
    this.server?.to('user:' + ownerId).emit('profileVisitorsChanged');
  };
  onModuleInit() { this.usersService.profileVisitorEvents.on('changed', this.visitorChanged); }
  onModuleDestroy() { this.usersService.profileVisitorEvents.off('changed', this.visitorChanged); }
  @WebSocketServer()
  server: Server;

  // Map to store connected users: userId -> Set of socketIds
  private connectedUsers = new Map<string, Set<string>>();
  private ringTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Server-side timers for direct calls: free-trial cut-off or per-minute billing.
  private callTimers = new Map<string, ReturnType<typeof setTimeout>[]>();
  // Active direct calls, so they can be ended if a participant goes offline
  // (otherwise per-minute billing would keep charging).
  private activeDirectCalls = new Map<string, { callerId: string; receiverId: string }>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly videoCallsService: VideoCallsService,
    private readonly usersService: UsersService,
    private readonly matchesService: MatchesService,
    private readonly jwtService: JwtService,
    private readonly directCalls: DirectCallsService,
  ) {}

  private clearCallTimers(callId: string) {
    this.clearRingTimer(callId);
    for (const timer of this.callTimers.get(callId) ?? []) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.callTimers.delete(callId);
    this.activeDirectCalls.delete(callId);
  }

  /** Ends a call on the server's behalf (time limit, no coins, participant offline). */
  private async endCallBySystem(callId: string, reason: string) {
    this.clearCallTimers(callId);
    try {
      const call = await this.videoCallsService.findById(callId);
      if (!call || (call.status !== 'active' && call.status !== 'ringing')) return;
      const endedCall = await this.videoCallsService.finish(call.id, call.callerId, call.status === 'ringing' ? 'missed' : 'ended');
      if (endedCall.mode === 'direct') {
        await this.directCalls.setEndReason(endedCall.id, reason);
        endedCall.endReason = reason;
      } else {
        const endedMessage = await this.messagesService.upsertCallLog(endedCall);
        this.emitToUser(endedCall.callerId, 'messageUpdated', endedMessage);
        this.emitToUser(endedCall.receiverId, 'messageUpdated', endedMessage);
      }
      const payload = { call: endedCall, endedBy: reason };
      this.emitToUser(endedCall.callerId, 'videoCallEnded', payload);
      this.emitToUser(endedCall.receiverId, 'videoCallEnded', payload);
    } catch {
      // The call was already ended by a participant.
    }
  }

  /**
   * Starts server-side enforcement for an answered direct call: a free trial
   * is cut after its allowance; a paid call is charged per started minute and
   * ended as soon as the caller cannot pay for the next minute.
   */
  private async startDirectCallBilling(call: VideoCall) {
    this.activeDirectCalls.set(call.id, { callerId: call.callerId, receiverId: call.receiverId });
    const settings = await this.directCalls.settings();
    const ratePerMinute = call.ratePerMinute ?? this.directCalls.rateFor(settings, call.callType);

    if (call.isFreeTrial) {
      const limitSeconds = this.directCalls.freeSecondsFor(settings, call.callType);
      this.callTimers.set(call.id, [setTimeout(() => void this.endCallBySystem(call.id, 'free_limit'), limitSeconds * 1000)]);
      return { isFreeTrial: true, limitSeconds, ratePerMinute };
    }

    const first = await this.directCalls.chargeMinute(call.id);
    if (!first.charged) {
      await this.endCallBySystem(call.id, 'coins_exhausted');
      return { isFreeTrial: false, ratePerMinute, balance: first.balance, ended: true };
    }
    const interval = setInterval(() => {
      void this.directCalls.chargeMinute(call.id).then((next) => {
        if (!next.charged) return this.endCallBySystem(call.id, 'coins_exhausted');
        this.emitToUser(call.callerId, 'callBilling', { callId: call.id, ratePerMinute, ...next });
      }).catch(() => undefined);
    }, 60_000);
    this.callTimers.set(call.id, [interval]);
    return { isFreeTrial: false, ratePerMinute, ...first };
  }

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

  /**
   * Rings the receiver only if they are online right now; an offline receiver
   * is never rung later (the call shows up as missed instead). Unanswered
   * calls end after RING_SECONDS.
   */
  private async ringReceiver(call: VideoCall, payload: Record<string, unknown>) {
    const online = this.isUserOnline(call.receiverId);
    if (online) this.emitToUser(call.receiverId, 'incomingVideoCall', payload);
    else await this.videoCallsService.markReceiverOffline(call.id);
    this.ringTimers.set(call.id, setTimeout(() => {
      this.ringTimers.delete(call.id);
      void this.endCallBySystem(call.id, 'no_answer');
    }, RING_SECONDS * 1000));
    return online;
  }

  /** The receiver came online while a call to them is still ringing: ring now. */
  private async ringPendingCalls(userId: string) {
    try {
      const calls = await this.videoCallsService.pendingRingsFor(userId, RING_SECONDS);
      for (const call of calls) {
        await this.videoCallsService.markRinging(call.id);
        const [caller, receiver] = await Promise.all([
          this.videoCallsService.participant(call.callerId),
          this.videoCallsService.participant(call.receiverId),
        ]);
        this.emitToUser(userId, 'incomingVideoCall', { call, callerId: call.callerId, conversationId: call.conversationId, callType: call.callType, caller, receiver, mode: call.mode });
        this.emitToUser(call.callerId, 'callRinging', { callId: call.id });
      }
    } catch {
      // The client also polls /video-calls/incoming.
    }
  }

  /** Which of these users are online now (only those who show their status), for dots on profiles. */
  @SubscribeMessage('presenceOf')
  async presenceOf(@MessageBody() data: { userIds?: unknown }, @ConnectedSocket() client: Socket) {
    const viewerId = this.getUserIdForSocket(client);
    if (!viewerId || !Array.isArray(data?.userIds)) return { userIds: [] };
    const ids = [...new Set(data.userIds.filter((id): id is string => typeof id === 'string' && id.length <= 64))].slice(0, 150);
    const live = ids.filter((id) => id !== viewerId && this.isUserOnline(id));
    return { userIds: await this.usersService.visibleOnlineUserIds(live) };
  }

  /** Online people among the viewer's call partners (respects "show online status"). */
  @SubscribeMessage('callContactsOnline')
  async callContactsOnline(@ConnectedSocket() client: Socket) {
    const viewerId = this.getUserIdForSocket(client);
    if (!viewerId) return { userIds: [] };
    const partnerIds = await this.videoCallsService.recentCallPartnerIds(viewerId);
    const live = partnerIds.filter((id) => this.isUserOnline(id));
    return { userIds: await this.usersService.visibleOnlineUserIds(live) };
  }

  private clearRingTimer(callId: string) {
    const timer = this.ringTimers.get(callId);
    if (timer) clearTimeout(timer);
    this.ringTimers.delete(callId);
  }

  disconnectUser(userId: string) {
    this.server?.in(`user:${userId}`).disconnectSockets(true);
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
      if (!userId || !await this.usersService.isActiveAccount(userId)) throw new Error('Account is not active');
      client.data.userId = userId;
    } catch {
      client.disconnect(true);
      return;
    }

    if (userId) {
      const authenticatedUserId = userId;
      client.use(async (_packet, next) => {
        try {
          if (!await this.usersService.isActiveAccount(authenticatedUserId)) {
            next(new Error('Account is no longer active'));
            client.disconnect(true);
            return;
          }
          next();
        } catch { next(new Error('Unable to verify account')); client.disconnect(true); }
      });
      await client.join(`user:${userId}`);
      const userSockets = this.connectedUsers.get(userId);
      if (!userSockets || userSockets.size === 0) {
        this.connectedUsers.set(userId, new Set([client.id]));
        await this.usersService.updatePresence(userId, true);
        await this.broadcastPresenceToMatches(userId, true);
        await this.ringPendingCalls(userId);
      } else {
        userSockets.add(client.id);
      }
      client.emit('presenceReady');
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
      const offlineUserId = disconnectedUserId;
      for (const [callId, participants] of this.activeDirectCalls.entries()) {
        if (participants.callerId !== offlineUserId && participants.receiverId !== offlineUserId) continue;
        setTimeout(() => {
          if (!this.isUserOnline(offlineUserId)) void this.endCallBySystem(callId, 'disconnected');
        }, OFFLINE_END_DELAY_MS);
      }
      const now = new Date();
      await this.usersService.updatePresence(disconnectedUserId, false);
      await this.broadcastPresenceToMatches(disconnectedUserId, false, now);
    }
  }

  private async broadcastPresenceToMatches(userId: string, isOnline: boolean, lastSeen?: Date) {
    try {
      const activeMatches = await this.matchesService.presenceRecipients(userId);
      const payload = await this.usersService.visiblePresence(userId, isOnline, lastSeen);

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

  @SubscribeMessage('onlineFriendsSnapshot')
  async onlineFriendsSnapshot(@ConnectedSocket() client: Socket) {
    const viewerId = this.getUserIdForSocket(client);
    if (!viewerId) return { userIds: [] };
    const matches = await this.matchesService.presenceRecipients(viewerId);
    const friendIds = [...new Set(matches.map(match => match.senderId === viewerId ? match.receiverId : match.senderId))];
    if (!friendIds.length) return { userIds: [] };
    // Actual Socket.IO room membership is authoritative. Persisted isOnline
    // flags can survive a crashed server or an interrupted disconnect.
    const connected = await this.server.in(friendIds.map(id => 'user:' + id)).fetchSockets();
    const friends = new Set(friendIds);
    const liveIds = [...new Set(connected.map(socket => socket.data.userId).filter((id): id is string => typeof id === 'string' && friends.has(id)))];
    return { userIds: await this.usersService.visibleOnlineUserIds(liveIds) };
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
    this.emitToUser(data.receiverId, 'receiveMessage', await this.messagesService.forViewer(savedMessage, data.receiverId));
    
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

    const callType = data.callType === 'audio' ? 'audio' : 'video';
    const busy = await this.busyResponse(data.receiverId);
    if (busy) return busy;
    try {
      const call = await this.videoCallsService.start(data.conversationId, callerId, data.receiverId, callType);
      const callMessage = await this.messagesService.upsertCallLog(call);
      this.emitToUser(call.callerId, 'receiveMessage', callMessage);
      this.emitToUser(call.receiverId, 'receiveMessage', callMessage);
      const [caller, receiver] = await Promise.all([
        this.videoCallsService.participant(call.callerId),
        this.videoCallsService.participant(call.receiverId),
      ]);
      const payload = { call, callerId, conversationId: data.conversationId, callType, caller, receiver };
      const receiverOnline = await this.ringReceiver(call, payload);
      const callerPayload = { ...payload, receiverOnline };
      this.server.to(client.id).emit('videoCallStarted', callerPayload);
      return { event: 'videoCallStarted', data: callerPayload };
    } catch (error: any) {
      // Plan calls used up: the call goes ahead like any paid call (coins per
      // minute, or the monthly free trial calls).
      if (error?.message === PLAN_CALLS_USED) return this.startPaidCall(client, callerId, data.receiverId, callType);
      return { error: error?.message || 'Could not start call' };
    }
  }

  /** Paid call to someone the caller has not matched with (see DirectCallsService). */
  @SubscribeMessage('startDirectCall')
  async handleStartDirectCall(
    @MessageBody() data: { receiverId: string; callType?: 'audio' | 'video' },
    @ConnectedSocket() client: Socket,
  ) {
    const callerId = this.getUserIdForSocket(client);
    if (!callerId) return { error: 'Not authenticated' };

    return this.startPaidCall(client, callerId, data.receiverId, data.callType === 'audio' ? 'audio' : 'video');
  }

  /** Error returned to the caller when the other person is already on a call. */
  private async busyResponse(receiverId: string) {
    if (!receiverId || !this.isUserOnline(receiverId)) return null;
    // Only calls where both people are still connected count: a call left
    // open by a closed browser must not keep someone "busy".
    const calls = await this.videoCallsService.busyCandidates(receiverId, RING_SECONDS);
    if (!calls.some((call) => this.isUserOnline(call.callerId) && this.isUserOnline(call.receiverId))) return null;
    const receiver = await this.videoCallsService.participant(receiverId);
    return { error: `${receiver?.name ?? 'This person'} is busy on another call. Try again later.`, code: 'BUSY' };
  }

  private async startPaidCall(client: Socket, callerId: string, receiverId: string, callType: 'audio' | 'video') {
    const busy = await this.busyResponse(receiverId);
    if (busy) return busy;
    try {
      const plan = await this.directCalls.planCall(callerId, receiverId, callType);
      const call = await this.directCalls.createCall(callerId, receiverId, callType, plan);
      const [caller, receiver] = await Promise.all([
        this.videoCallsService.participant(call.callerId),
        this.videoCallsService.participant(call.receiverId),
      ]);
      const payload = { call, callerId, conversationId: null, callType, caller, receiver, mode: 'direct' as const };
      const receiverOnline = await this.ringReceiver(call, payload);
      const callerPayload = { ...payload, receiverOnline };
      this.server.to(client.id).emit('videoCallStarted', callerPayload);
      return { event: 'videoCallStarted', data: callerPayload };
    } catch (error: any) {
      const message = error?.message || 'Could not start call';
      return message === UPGRADE_REQUIRED
        ? { error: 'Your free calls for this month are used up. Buy coins to keep calling.', code: UPGRADE_REQUIRED }
        : { error: message };
    }
  }

  /** Gift during a call: charged to the sender, receiver notified at once. */
  @SubscribeMessage('sendCallGift')
  async handleSendCallGift(
    @MessageBody() data: { callId: string; amount: number },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = this.getUserIdForSocket(client);
    if (!senderId) return { error: 'Not authenticated' };
    try {
      const gift = await this.directCalls.sendCallGift(senderId, data.callId, data.amount);
      this.emitToUser(gift.receiverId, 'callGiftReceived', { callId: data.callId, senderName: gift.senderName, coins: gift.coins });
      return { ok: true, coins: gift.coins, balance: gift.balance };
    } catch (error: any) {
      const message = error?.message || 'Gift could not be sent.';
      return message === UPGRADE_REQUIRED
        ? { error: 'Not enough coins for this gift.', code: UPGRADE_REQUIRED }
        : { error: message };
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
      this.clearRingTimer(call.id);
      if (call.mode === 'direct') {
        const billing = await this.startDirectCallBilling(call);
        const payload = { call, receiverId, maxDurationMinutes: null, mode: 'direct' as const, billing };
        // Only the caller sees balances; the receiver just needs any time limit.
        this.emitToUser(data.callerId, 'videoCallAccepted', payload);
        const receiverPayload = { ...payload, billing: { isFreeTrial: billing.isFreeTrial, limitSeconds: 'limitSeconds' in billing ? billing.limitSeconds : undefined } };
        this.server.to(client.id).emit('videoCallAccepted', receiverPayload);
        client.to(`user:${receiverId}`).emit('videoCallAnsweredElsewhere', { callId: call.id });
        return { event: 'videoCallAccepted', data: receiverPayload };
      }
      const callMessage = await this.messagesService.upsertCallLog(call);
      this.emitToUser(call.callerId, 'messageUpdated', callMessage);
      this.emitToUser(call.receiverId, 'messageUpdated', callMessage);
      const limitSeconds = this.videoCallsService.planCallSeconds(call);
      const payload = { call, receiverId, maxDurationMinutes: null, billing: limitSeconds ? { isFreeTrial: true, limitSeconds } : undefined };
      this.emitToUser(data.callerId, 'videoCallAccepted', payload);
      this.server.to(client.id).emit('videoCallAccepted', payload);
      // The receiver's other tabs/devices are still ringing: tell them to stop.
      client.to(`user:${receiverId}`).emit('videoCallAnsweredElsewhere', { callId: call.id });
      if (limitSeconds) {
        this.callTimers.set(call.id, [setTimeout(() => void this.endCallBySystem(call.id, 'free_limit'), limitSeconds * 1000)]);
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
      this.clearCallTimers(data.callId);
      const call = await this.videoCallsService.finish(data.callId, userId, data.status || 'ended');
      if (call.mode !== 'direct') {
        const callMessage = await this.messagesService.upsertCallLog(call);
        this.emitToUser(call.callerId, 'messageUpdated', callMessage);
        this.emitToUser(call.receiverId, 'messageUpdated', callMessage);
      }
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
