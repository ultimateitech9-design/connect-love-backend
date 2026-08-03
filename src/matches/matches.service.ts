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
      // Match cards only display the primary photo. Returning every full-size
      // base64 photo made the response tens of MB for users with many matches.
      photos: user.photos?.length ? [user.photos[0]] : [],
      photosVisibleToNonMatches: true,
      interests: user.interests || [],
      personality: user.personalityWords || [],
      hobbies: user.hobbies || [],
    };
  }

  private matchesWithProfilesQuery() {
    // Match cards use a stable subset so unrelated, newly-added user columns
    // cannot break this endpoint before a production schema migration runs.
    return this.matchesRepository
      .createQueryBuilder('match')
      .leftJoin('match.sender', 'sender')
      .leftJoin('match.receiver', 'receiver')
      .addSelect([
        'sender.id', 'sender.name', 'sender.birthDate', 'sender.bio', 'sender.photos',
        'sender.isOnline', 'sender.showOnlineStatus', 'sender.city', 'sender.profession',
        'receiver.id', 'receiver.name', 'receiver.birthDate', 'receiver.bio', 'receiver.photos',
        'receiver.isOnline', 'receiver.showOnlineStatus', 'receiver.city', 'receiver.profession',
      ]);
  }

  private async enrichMatches(matches: MatchRelation[], userId: string): Promise<any[]> {
    if (matches.length === 0) return [];

    // Fetch message metadata for every conversation in one query. The old code
    // executed two queries per match, which made this endpoint increasingly slow.
    const messageSummary = await this.msgRepo
      .createQueryBuilder('message')
      .select('message.conversationId', 'conversationId')
      .addSelect('MAX(message.createdAt)', 'lastMessageTime')
      .addSelect(
        'SUM(CASE WHEN message.receiverId = :userId AND message.isRead = :isRead THEN 1 ELSE 0 END)',
        'unreadCount',
      )
      .where('message.conversationId IN (:...matchIds)', { matchIds: matches.map((match) => match.id) })
      .setParameters({ userId, isRead: false })
      .groupBy('message.conversationId')
      .getRawMany<{ conversationId: string; lastMessageTime: string | Date | null; unreadCount: string }>();

    const summaries = new Map(messageSummary.map((row) => [row.conversationId, row]));
    const enriched = matches.map((match) => {
      const summary = summaries.get(match.id);
      return {
        ...match,
        sender: this.serializeUser(match.sender),
        receiver: this.serializeUser(match.receiver),
        lastMessage: 'No messages yet.',
        lastMessageTime: summary?.lastMessageTime || match.createdAt,
        unreadCount: Number(summary?.unreadCount || 0),
      };
    });

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
    const matches = await this.matchesWithProfilesQuery()
      .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId })
      .andWhere('match.status = :status', { status })
      .orderBy('match.createdAt', 'DESC')
      .getMany();

    return this.enrichMatches(matches, userId);
  }

  async findAll(userId: string): Promise<any[]> {
    const matches = await this.matchesWithProfilesQuery()
      .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId })
      .orderBy('match.createdAt', 'DESC')
      .getMany();

    return this.enrichMatches(matches, userId);
  }

  async findForFilter(
    userId: string,
    filter?: 'active' | 'sent' | 'received' | 'blocked',
  ): Promise<any[]> {
    const query = this.matchesWithProfilesQuery()
      .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId });

    if (filter === 'active') {
      query.andWhere('match.status = :status', { status: MatchStatus.MATCHED });
    } else if (filter === 'sent') {
      query.andWhere('match.status = :status AND match.senderId = :userId', { status: MatchStatus.PENDING, userId });
    } else if (filter === 'received') {
      query.andWhere('match.status = :status AND match.receiverId = :userId', { status: MatchStatus.PENDING, userId });
    } else if (filter === 'blocked') {
      query.andWhere('match.status = :status AND match.senderId = :userId', { status: MatchStatus.BLOCKED, userId });
    } else {
      query.andWhere('match.status IN (:...statuses)', {
        statuses: [MatchStatus.MATCHED, MatchStatus.PENDING, MatchStatus.BLOCKED],
      });
    }

    const matches = await query.orderBy('match.createdAt', 'DESC').getMany();
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

  async deletePendingRequest(id: string, senderId: string): Promise<{ deleted: boolean }> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Pending request not found.');
    if (match.senderId !== senderId) {
      throw new ForbiddenException('Only the sender can delete this request.');
    }
    if (match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be deleted.');
    }

    await this.matchesRepository.remove(match);
    return { deleted: true };
  }

}
