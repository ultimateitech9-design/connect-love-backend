import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { MatchRelation, MatchStatus } from '../matches/match.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private msgRepo: Repository<Message>,
    @InjectRepository(MatchRelation)
    private matchRepo: Repository<MatchRelation>,
  ) {}

  private async assertConversationAccess(conversationId: string, userId: string): Promise<MatchRelation> {
    const match = await this.matchRepo.findOne({ where: { id: conversationId } });
    if (!match) throw new NotFoundException('Conversation not found.');
    if (match.senderId !== userId && match.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this conversation.');
    }
    if (match.status !== MatchStatus.MATCHED) {
      throw new ForbiddenException('Messages are available only after both users match.');
    }
    return match;
  }

  async findAll(conversationId: string, userId: string): Promise<Message[]> {
    await this.assertConversationAccess(conversationId, userId);
    return this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' }
    });
  }

  async create(conversationId: string, senderId: string, receiverId: string, content: string): Promise<Message> {
    const match = await this.assertConversationAccess(conversationId, senderId);
    const validReceiver = receiverId === match.senderId || receiverId === match.receiverId;
    if (!validReceiver || receiverId === senderId) {
      throw new ForbiddenException('Invalid receiver for this conversation.');
    }
    const msg = this.msgRepo.create({ conversationId, senderId, receiverId, content });
    return this.msgRepo.save(msg);
  }

  async remove(id: string, userId: string): Promise<void> {
    const msg = await this.msgRepo.findOne({ where: { id } });
    if (msg && (msg.senderId === userId || msg.receiverId === userId)) {
      await this.msgRepo.remove(msg);
    }
  }

  async markAsRead(conversationId: string, userId: string): Promise<Message[]> {
    await this.assertConversationAccess(conversationId, userId);
    const unreadMessages = await this.msgRepo.find({
      where: { conversationId, receiverId: userId, isRead: false },
    });

    if (unreadMessages.length === 0) return [];

    await this.msgRepo.update(
      { conversationId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    return unreadMessages.map((message) => ({ ...message, isRead: true }));
  }

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<Record<string, string[]>> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found.');

    let reactionsMap: Record<string, string[]> = {};
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
}
