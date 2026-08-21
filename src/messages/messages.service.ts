import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { randomUUID } from 'crypto';
import { Message } from './message.entity';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { User } from '../users/user.entity';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { PlanUsageService } from '../plans/plan-usage.service';
import { FirstImpression } from '../first-impressions/first-impression.entity';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private msgRepo: Repository<Message>,
    @InjectRepository(MatchRelation)
    private matchRepo: Repository<MatchRelation>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(FirstImpression)
    private firstImpressionRepo: Repository<FirstImpression>,
    private readonly pushNotifications: PushNotificationsService,
    private readonly planUsage: PlanUsageService,
  ) {}

  private queueMessagePush(message: Message): void {
    void (async () => {
      const [sender, receiver] = await Promise.all([
        this.userRepo.findOne({ where: { id: message.senderId }, select: ['id', 'name'] }),
        this.userRepo.findOne({ where: { id: message.receiverId }, select: ['id', 'notifyMessages'] }),
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
          senderId: message.senderId,
        },
      });
    })().catch((error) => {
      this.logger.warn(`Could not queue message push: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  private isOptionalMessageSchemaMismatch(error: any): boolean {
    const code = error?.driverError?.code || error?.code;
    return code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_DEFAULT_FOR_FIELD';
  }

  private normalizeCoreMessage(row: any): Message {
    return {
      ...row,
      isRead: Boolean(row.isRead),
      reactions: null,
      deletedForUserIds: null,
      deletedForEveryone: false,
      pinnedByUserIds: null,
      starredByUserIds: null,
      replyToMessageId: null,
      editedAt: null,
    } as Message;
  }

  private async assertConversationAccess(conversationId: string, userId: string): Promise<MatchRelation> {
    const match = await this.matchRepo.findOne({ where: { id: conversationId } });
    if (!match) throw new NotFoundException('Conversation not found.');
    if (match.senderId !== userId && match.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this conversation.');
    }
    if (match.status !== MatchStatus.MATCHED) {
      throw new ForbiddenException('Messages are available only after both users match.');
    }
    const { limits } = await this.planUsage.get(userId);
    if (limits.matches !== Number.MAX_SAFE_INTEGER) {
      const unlockedRows = await this.matchRepo.createQueryBuilder('candidate')
        .select(['candidate.id'])
        .where('(candidate.senderId = :userId OR candidate.receiverId = :userId)', { userId })
        .andWhere('candidate.status = :status', { status: MatchStatus.MATCHED })
        .andWhere(`COALESCE(candidate.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')`)
        .orderBy('candidate.updatedAt', 'ASC')
        .addOrderBy('candidate.id', 'ASC')
        .take(limits.matches)
        .getMany();
      if (!unlockedRows.some((candidate) => candidate.id === match.id)) {
        throw new ForbiddenException(`This match is locked. Your plan allows ${limits.matches} active matches. Upgrade your plan to unlock it.`);
      }
    }
    return match;
  }

  private parseUserList(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  private isMan(gender: string | null | undefined): boolean {
    return ['male', 'man', 'men', 'boy', 'm'].includes(String(gender || '').trim().toLowerCase());
  }

  /** The original First Impression sender needs an active paid plan to read a woman's reply. */
  private async shouldLockFirstImpressionReply(viewerId: string, senderId: string): Promise<boolean> {
    if (senderId === viewerId) return false;
    const [viewer, impression] = await Promise.all([
      this.userRepo.findOne({ where: { id: viewerId }, select: ['id', 'gender', 'plan', 'planExpiresAt'] }),
      this.firstImpressionRepo.findOne({ where: { senderId: viewerId, receiverId: senderId } }),
    ]);
    if (!viewer || !impression || !this.isMan(viewer.gender)) return false;
    const hasActivePlan = viewer.plan !== 'free' && (!viewer.planExpiresAt || viewer.planExpiresAt > new Date());
    return !hasActivePlan;
  }

  async forViewer(message: Message, viewerId: string): Promise<Message & { lockedForPlan?: boolean }> {
    if (!(await this.shouldLockFirstImpressionReply(viewerId, message.senderId))) return message;
    return { ...message, content: 'Unlock your plan to read her reply.', lockedForPlan: true };
  }
  private async assertMessageAccess(messageId: string, userId: string): Promise<Message> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found.');
    await this.assertConversationAccess(msg.conversationId, userId);
    if (msg.senderId !== userId && msg.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this message.');
    }
    return msg;
  }

  async findAll(conversationId: string, userId: string, requestedLimit = 50, before?: string): Promise<Message[]> {
    await this.assertConversationAccess(conversationId, userId);
    const limit = Math.min(100, Math.max(1, Math.floor(requestedLimit)));
    const beforeDate = before ? new Date(before) : null;
    const hasValidCursor = !!beforeDate && !Number.isNaN(beforeDate.getTime());
    try {
      const messages = await this.msgRepo.find({
        where: hasValidCursor ? { conversationId, createdAt: LessThan(beforeDate!) } : { conversationId },
        order: { createdAt: 'DESC' },
        take: limit,
      });
      const visible = messages
        .filter((message) => !this.parseUserList(message.deletedForUserIds).includes(userId))
        .reverse();
      return Promise.all(visible.map((message) => this.forViewer(message, userId)));
    } catch (error) {
      if (!this.isOptionalMessageSchemaMismatch(error)) throw error;
      const cursorSql = hasValidCursor ? ' AND createdAt < ?' : '';
      const params: Array<string | number | Date> = hasValidCursor ? [conversationId, beforeDate!, limit] : [conversationId, limit];
      const rows = await this.msgRepo.query(
        `SELECT id, conversationId, senderId, receiverId, content, isRead, createdAt FROM messages WHERE conversationId = ?${cursorSql} ORDER BY createdAt DESC LIMIT ?`,
        params,
      );
      return Promise.all(rows.reverse().map((row: any) => this.forViewer(this.normalizeCoreMessage(row), userId)));
    }
  }

  async create(conversationId: string, senderId: string, receiverId: string, content: string, replyToMessageId?: string): Promise<Message> {
    const match = await this.assertConversationAccess(conversationId, senderId);
    const validReceiver = receiverId === match.senderId || receiverId === match.receiverId;
    if (!validReceiver || receiverId === senderId) {
      throw new ForbiddenException('Invalid receiver for this conversation.');
    }
    if (replyToMessageId) {
      const replyMessage = await this.assertMessageAccess(replyToMessageId, senderId);
      if (replyMessage.conversationId !== conversationId) {
        throw new ForbiddenException('Reply message is not in this conversation.');
      }
    }
    const { limits } = await this.planUsage.get(senderId);
    if (content.startsWith('__voice_message__:') && !limits.voiceMessages) {
      throw new ForbiddenException('Voice messages are not included in the Free plan. Upgrade to continue.');
    }
    if (content.startsWith('__photo_message__:') || content.startsWith('__video_message__:')) {
      await this.planUsage.assertAndRecord(senderId, 'sharedImagesPerMonth', 'Media sharing', receiverId);
    }
    if (limits.messagesPerUser !== null) {
      const sent = await this.msgRepo.count({ where: { senderId, receiverId } });
      if (sent >= limits.messagesPerUser) {
        throw new BadRequestException(`Free plan allows ${limits.messagesPerUser} messages to each match. Upgrade for unlimited messages.`);
      }
    }
    const msg = this.msgRepo.create({ conversationId, senderId, receiverId, content, replyToMessageId: replyToMessageId || null });
    try {
      const savedMessage = await this.msgRepo.save(msg);
      this.queueMessagePush(savedMessage);
      return savedMessage;
    } catch (error) {
      if (!this.isOptionalMessageSchemaMismatch(error)) throw error;
      const id = randomUUID();
      await this.msgRepo.query(
        'INSERT INTO messages (id, conversationId, senderId, receiverId, content, isRead, createdAt) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP(6))',
        [id, conversationId, senderId, receiverId, content],
      );
      const rows = await this.msgRepo.query(
        'SELECT id, conversationId, senderId, receiverId, content, isRead, createdAt FROM messages WHERE id = ? LIMIT 1',
        [id],
      );
      const savedMessage = this.normalizeCoreMessage(rows[0]);
      this.queueMessagePush(savedMessage);
      return savedMessage;
    }
  }

  async remove(id: string, userId: string, scope: 'me' | 'everyone' = 'everyone'): Promise<Message> {
    const msg = await this.assertMessageAccess(id, userId);
    if (scope === 'everyone') {
      if (msg.senderId !== userId) {
        throw new ForbiddenException('Only the sender can delete this message for everyone.');
      }
      const deleteForEveryoneWindowMs = 10 * 60 * 1000;
      if (Date.now() - new Date(msg.createdAt).getTime() > deleteForEveryoneWindowMs) {
        throw new ForbiddenException('Delete for everyone is only available for 10 minutes.');
      }
      msg.deletedForEveryone = true;
      msg.content = 'This message was deleted';
      msg.reactions = null;
    } else {
      const deletedFor = new Set(this.parseUserList(msg.deletedForUserIds));
      deletedFor.add(userId);
      msg.deletedForUserIds = JSON.stringify([...deletedFor]);
    }
    return this.msgRepo.save(msg);
  }

  async markAsRead(conversationId: string, userId: string): Promise<Message[]> {
    await this.assertConversationAccess(conversationId, userId);
    let unreadMessages: Message[];
    try {
      unreadMessages = await this.msgRepo.find({
        where: { conversationId, receiverId: userId, isRead: false },
      });
    } catch (error) {
      if (!this.isOptionalMessageSchemaMismatch(error)) throw error;
      const rows = await this.msgRepo.query(
        'SELECT id, conversationId, senderId, receiverId, content, isRead, createdAt FROM messages WHERE conversationId = ? AND receiverId = ? AND isRead = 0',
        [conversationId, userId],
      );
      unreadMessages = rows.map((row: any) => this.normalizeCoreMessage(row));
    }

    if (unreadMessages.length === 0) return [];

    await this.msgRepo.update(
      { conversationId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    return unreadMessages.map((message) => ({ ...message, isRead: true }));
  }

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<Record<string, string[]>> {
    const msg = await this.assertMessageAccess(messageId, userId);
    if (msg.deletedForEveryone) throw new ForbiddenException('Cannot react to a deleted message.');

    let reactionsMap: Record<string, string[]> = {};
    if (msg.reactions) {
      try {
        reactionsMap = JSON.parse(msg.reactions);
      } catch (e) {
        reactionsMap = {};
      }
    }

    // A user can keep exactly one reaction on a message. Selecting another
    // emoji replaces the previous one instead of creating multiple reactions.
    for (const [reactionEmoji, userIds] of Object.entries(reactionsMap)) {
      reactionsMap[reactionEmoji] = Array.isArray(userIds)
        ? userIds.map(String).filter((id) => id !== userId)
        : [];
      if (reactionsMap[reactionEmoji].length === 0) delete reactionsMap[reactionEmoji];
    }
    reactionsMap[emoji] = [...new Set([...(reactionsMap[emoji] || []).map(String), userId])];

    msg.reactions = JSON.stringify(reactionsMap);
    await this.msgRepo.save(msg);
    return reactionsMap;
  }

  async clearConversation(conversationId: string, userId: string): Promise<void> {
    const match = await this.assertConversationAccess(conversationId, userId);
    const messages = await this.msgRepo.find({ where: { conversationId } });
    await Promise.all(messages.map((message) => {
      const deletedFor = new Set(this.parseUserList(message.deletedForUserIds));
      deletedFor.add(userId);
      message.deletedForUserIds = JSON.stringify([...deletedFor]);
      return this.msgRepo.save(message);
    }));

    const hiddenFor = new Set(this.parseUserList(match.hiddenFromChatForUserIds));
    hiddenFor.add(userId);
    match.hiddenFromChatForUserIds = JSON.stringify([...hiddenFor]);
    await this.matchRepo.save(match);
  }

  async removeMany(ids: string[], userId: string): Promise<void> {
    const messages = await this.msgRepo.find({
      where: [
        { id: In(ids), senderId: userId },
        { id: In(ids), receiverId: userId }
      ]
    });
    if (messages.length > 0) {
      await Promise.all(messages.map((message) => {
        const deletedFor = new Set(this.parseUserList(message.deletedForUserIds));
        deletedFor.add(userId);
        message.deletedForUserIds = JSON.stringify([...deletedFor]);
        return this.msgRepo.save(message);
      }));
    }
  }

  async update(id: string, userId: string, newContent: string): Promise<Message> {
    const msg = await this.assertMessageAccess(id, userId);
    if (msg.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages.');
    }
    if (msg.deletedForEveryone) throw new ForbiddenException('Cannot edit a deleted message.');
    msg.content = newContent;
    msg.editedAt = new Date();
    return this.msgRepo.save(msg);
  }

  async togglePin(id: string, userId: string): Promise<Message> {
    const msg = await this.assertMessageAccess(id, userId);
    const pinnedBy = new Set(this.parseUserList(msg.pinnedByUserIds));
    if (pinnedBy.has(userId)) pinnedBy.delete(userId);
    else pinnedBy.add(userId);
    msg.pinnedByUserIds = JSON.stringify([...pinnedBy]);
    return this.msgRepo.save(msg);
  }

  async toggleStar(id: string, userId: string): Promise<Message> {
    const msg = await this.assertMessageAccess(id, userId);
    const starredBy = new Set(this.parseUserList(msg.starredByUserIds));
    if (starredBy.has(userId)) starredBy.delete(userId);
    else starredBy.add(userId);
    msg.starredByUserIds = JSON.stringify([...starredBy]);
    return this.msgRepo.save(msg);
  }

  async getInfo(id: string, userId: string): Promise<Message> {
    return this.assertMessageAccess(id, userId);
  }
}
