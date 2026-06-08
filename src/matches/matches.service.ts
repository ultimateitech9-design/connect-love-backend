import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchRelation, MatchStatus } from './match.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(MatchRelation)
    private matchesRepository: Repository<MatchRelation>,
    @InjectRepository(Message)
    private msgRepo: Repository<Message>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  private serializeUser(user?: User): any {
    if (!user) return null;
    return {
      ...user,
      age: user.age,
      avatarUrl: user.avatarUrl,
      photos: user.photos || [],
      interests: user.interests || [],
      personality: user.personalityWords || [],
      hobbies: user.hobbies || [],
    };
  }

  private async enrichMatches(matches: MatchRelation[], userId: string): Promise<any[]> {
    const enriched = await Promise.all(matches.map(async (match) => {
      const lastMessage = await this.msgRepo.findOne({
        where: { conversationId: match.id },
        order: { createdAt: 'DESC' },
      });
      const unreadCount = await this.msgRepo.count({
        where: { conversationId: match.id, receiverId: userId, isRead: false },
      });

      return {
        ...match,
        sender: this.serializeUser(match.sender),
        receiver: this.serializeUser(match.receiver),
        lastMessage: lastMessage ? lastMessage.content : 'No messages yet.',
        lastMessageTime: lastMessage ? lastMessage.createdAt : match.createdAt,
        unreadCount,
      };
    }));

    return enriched.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
    );
  }

  private async findExisting(senderId: string, receiverId: string): Promise<MatchRelation | null> {
    return this.matchesRepository.findOne({
      where: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
      relations: ['sender', 'receiver'],
    });
  }

  async findAllByStatus(userId: string, status: MatchStatus): Promise<any[]> {
    const matches = await this.matchesRepository.find({ 
      where: [
        { senderId: userId, status },
        { receiverId: userId, status }
      ], 
      order: { createdAt: 'DESC' },
      relations: ['sender', 'receiver']
    });

    return this.enrichMatches(matches, userId);
  }

  async findAll(userId: string): Promise<any[]> {
    const matches = await this.matchesRepository.find({ 
      where: [
        { senderId: userId },
        { receiverId: userId }
      ],
      order: { createdAt: 'DESC' },
      relations: ['sender', 'receiver']
    });

    return this.enrichMatches(matches, userId);
  }

  async create(senderId: string, receiverId: string, isSuperLike: boolean = false): Promise<MatchRelation> {
    const match = this.matchesRepository.create({ senderId, receiverId, status: MatchStatus.PENDING, isSuperLike });
    return this.matchesRepository.save(match);
  }

  async swipe(senderId: string, receiverId: string, action: 'like' | 'pass' | 'superlike'): Promise<MatchRelation> {
    if (!receiverId) throw new BadRequestException('receiverId is required.');
    if (senderId === receiverId) throw new BadRequestException('You cannot swipe on your own profile.');

    const receiver = await this.userRepo.findOne({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('Profile not found.');

    const existing = await this.findExisting(senderId, receiverId);
    const isSuperLike = action === 'superlike';

    if (existing?.status === MatchStatus.BLOCKED) {
      throw new BadRequestException('This profile is blocked.');
    }

    if (action === 'pass') {
      const match = existing || this.matchesRepository.create({ senderId, receiverId });
      match.senderId = senderId;
      match.receiverId = receiverId;
      match.status = MatchStatus.DECLINED;
      match.isSuperLike = false;
      return this.matchesRepository.save(match);
    }

    if (existing) {
      if (existing.status === MatchStatus.MATCHED) return existing;

      const isIncomingLike = existing.senderId === receiverId && existing.receiverId === senderId;
      if (existing.status === MatchStatus.PENDING && isIncomingLike) {
        existing.status = MatchStatus.MATCHED;
        existing.isSuperLike = existing.isSuperLike || isSuperLike;
        return this.matchesRepository.save(existing);
      }

      existing.senderId = senderId;
      existing.receiverId = receiverId;
      existing.status = MatchStatus.PENDING;
      existing.isSuperLike = existing.isSuperLike || isSuperLike;
      return this.matchesRepository.save(existing);
    }

    return this.matchesRepository.save(
      this.matchesRepository.create({
        senderId,
        receiverId,
        status: MatchStatus.PENDING,
        isSuperLike,
      }),
    );
  }

  async updateStatus(id: string, status: MatchStatus): Promise<MatchRelation | null> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (match) {
      match.status = status;
      return this.matchesRepository.save(match);
    }
    return null;
  }

  async blockMatch(id: string, blockerUserId: string): Promise<MatchRelation> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Match not found.');
    if (match.senderId !== blockerUserId && match.receiverId !== blockerUserId) {
      throw new ForbiddenException('You are not part of this match.');
    }

    match.status = MatchStatus.BLOCKED;
    if (match.senderId !== blockerUserId) {
      const temp = match.senderId;
      match.senderId = blockerUserId;
      match.receiverId = temp;
    }
    return this.matchesRepository.save(match);
  }

  async respond(id: string, action: 'accept' | 'decline', userId?: string): Promise<MatchRelation> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Match request not found.');
    if (userId && match.senderId !== userId && match.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this match request.');
    }

    if (action === 'accept') {
      match.status = MatchStatus.MATCHED;
      return this.matchesRepository.save(match);
    }

    match.status = MatchStatus.DECLINED;
    return this.matchesRepository.save(match);
  }

  async delete(id: string, userId?: string): Promise<{ deleted: boolean }> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (match) {
      if (userId && match.senderId !== userId && match.receiverId !== userId) {
        throw new ForbiddenException('You are not part of this match.');
      }
      await this.matchesRepository.remove(match);
    }
    return { deleted: true };
  }

  async simulateIncoming(receiverId: string): Promise<MatchRelation> {
    // create a fake user ID for the incoming request
    const mockSenderId = `mock_${Math.floor(Math.random() * 1000)}`;
    const match = this.matchesRepository.create({ senderId: mockSenderId, receiverId, status: MatchStatus.PENDING });
    return this.matchesRepository.save(match);
  }
}
