import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchRelation, MatchStatus } from './match.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';
import { PlanUsageService } from '../plans/plan-usage.service';
import { activePlan, isWoman } from '../plans/plan-entitlements';
import { dayStart } from '../plans/plan-entitlements';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(MatchRelation)
    private matchesRepository: Repository<MatchRelation>,
    @InjectRepository(Message)
    private msgRepo: Repository<Message>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private readonly planUsage: PlanUsageService,
  ) {}

  private async assertMatchCapacity(userId: string) {
    const { limits } = await this.planUsage.get(userId);
    const count = await this.matchesRepository.createQueryBuilder('match')
      .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId })
      .andWhere('match.status = :status', { status: MatchStatus.MATCHED })
      .getCount();
    if (count >= limits.matches) {
      throw new BadRequestException(`Your plan allows ${limits.matches} matches. Upgrade your plan to match with more people.`);
    }
  }

  private serializeUser(user?: User): any {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      age: user.age,
      // `photos[0]` is the card image. Do not duplicate the same large base64
      // value in `avatarUrl`, which previously doubled the response payload.
      avatarUrl: null,
      // Match cards only display the primary photo. Returning every full-size
      // base64 photo made the response tens of MB for users with many matches.
      photos: user.photos?.length ? [user.photos[0]] : [],
      bio: user.bio,
      isOnline: user.isOnline,
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
        'sender.id', 'sender.name', 'sender.birthDate', 'sender.bio', 'sender.photos', 'sender.isOnline',
        'receiver.id', 'receiver.name', 'receiver.birthDate', 'receiver.bio', 'receiver.photos', 'receiver.isOnline',
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
    const { limits } = await this.planUsage.get(userId);

    // The first matches a member unlocked remain open. Newer matches above the
    // plan allowance are retained but locked, rather than displacing an older
    // conversation or rejecting the match entirely.
    const allowedMatchedIds = new Set(
      enriched
        .filter((match) => match.status === MatchStatus.MATCHED)
        .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        .slice(0, limits.matches)
        .map((match) => match.id),
    );
    const sorted = enriched.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
    );
    return sorted.map((match) => {
      const locked = match.status === MatchStatus.MATCHED && !allowedMatchedIds.has(match.id);
      if (!locked) return { ...match, locked: false };
      const hidden = { id: null, name: 'Someone', photos: [], avatarUrl: null };
      return { ...match, sender: match.senderId === userId ? match.sender : hidden, receiver: match.receiverId === userId ? match.receiver : hidden, locked: true, lastMessage: 'Someone matched with you. Upgrade to unlock.' };
    });
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
    limit = 12,
    offset = 0,
  ): Promise<any[]> {
    const query = this.matchesWithProfilesQuery()
      .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId });

    if (filter === 'active') {
      query
        .andWhere('match.status = :status', { status: MatchStatus.MATCHED })
        .andWhere("COALESCE(match.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')");
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

    // Each dashboard tab renders a small page only. Loading every related
    // profile (and its photo) made accounts with many requests unnecessarily
    // slow to open.
    const matches = await query
      .orderBy('match.createdAt', 'DESC')
      .take(Math.min(Math.max(limit, 1), 20))
      .skip(Math.max(offset, 0))
      .getMany();
    const enriched = await this.enrichMatches(matches, userId);
    if (filter !== 'received') return enriched;
    const { user, limits } = await this.planUsage.get(userId);
    if (activePlan(user) !== 'free' || isWoman(user)) return enriched;

    // Free members can still see and accept incoming likes until their two
    // active-match allowance is actually used.  Previously every received
    // like was blurred for a free member, which made the two included matches
    // impossible to create. Once both slots are occupied, keep later likes
    // visible in the count but lock their profile/action until an upgrade (or
    // an active match is removed).
    const activeMatchCount = await this.matchesRepository.count({
      where: [
        { senderId: userId, status: MatchStatus.MATCHED },
        { receiverId: userId, status: MatchStatus.MATCHED },
      ],
    });
    if (activeMatchCount < limits.matches) return enriched;

    return enriched.map((match) => ({
      ...match,
      sender: match.senderId === userId ? match.sender : { id: null, name: 'Someone', photos: [], avatarUrl: null },
      receiver: match.receiverId === userId ? match.receiver : { id: null, name: 'Someone', photos: [], avatarUrl: null },
      locked: true,
    }));
  }

  async getSummary(userId: string) {
    const count = (status: MatchStatus, field?: 'senderId' | 'receiverId') => {
      const where: any = { status };
      if (field) where[field] = userId;
      return field
        ? this.matchesRepository.count({ where })
        : this.matchesRepository.createQueryBuilder('match')
          .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId })
          .andWhere('match.status = :status', { status })
          .getCount();
    };

    const [active, sent, received, blocked] = await Promise.all([
      count(MatchStatus.MATCHED),
      count(MatchStatus.PENDING, 'senderId'),
      count(MatchStatus.PENDING, 'receiverId'),
      count(MatchStatus.BLOCKED, 'senderId'),
    ]);
    return { active, sent, received, blocked };
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

    // Retrying the same outgoing like (for example after login or a double
    // click) is idempotent and must not consume another daily like.
    if (existing?.status === MatchStatus.MATCHED) return existing;
    if (existing?.status === MatchStatus.PENDING && existing.senderId === senderId) return existing;

    if (isSuperLike) await this.planUsage.assertAndRecord(senderId, 'superLikesPerMonth', 'Super Like', receiverId);
    const existingLikesToday = await this.matchesRepository.createQueryBuilder('match')
      .where('match.senderId = :senderId', { senderId })
      .andWhere('match.createdAt >= :start', { start: dayStart() })
      .andWhere('match.status IN (:...statuses)', { statuses: [MatchStatus.PENDING, MatchStatus.MATCHED] })
      .getCount();
    await this.planUsage.assertAndRecord(senderId, 'likesPerDay', 'Daily like', receiverId, true, undefined, existingLikesToday);

    if (existing) {
      const isIncomingLike = existing.senderId === receiverId && existing.receiverId === senderId;
      if (existing.status === MatchStatus.PENDING && isIncomingLike) {
        // Only the member performing the matching action must have capacity.
        // The other member may still receive the match in a locked state.
        await this.assertMatchCapacity(senderId);
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
    if (userId && match.receiverId !== userId) {
      throw new ForbiddenException('Only the receiver can respond to this match request.');
    }

    if (action === 'accept') {
      // The receiver is the actor here. If the other member has exhausted
      // their allowance, enrichMatches keeps this new match blurred for them.
      if (userId) await this.assertMatchCapacity(userId);
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

  async undoSwipe(senderId: string, receiverId: string): Promise<{ deleted: boolean }> {
    const match = await this.matchesRepository.findOne({ where: { senderId, receiverId } });
    if (!match) throw new NotFoundException('Swipe not found.');
    if (match.status === MatchStatus.MATCHED || match.status === MatchStatus.BLOCKED) {
      throw new BadRequestException('This swipe can no longer be undone.');
    }

    await this.planUsage.assertAndRecord(senderId, 'rewindsPerMonth', 'Profile rewind', receiverId);

    await this.matchesRepository.remove(match);
    return { deleted: true };
  }

}
