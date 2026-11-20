import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter } from 'node:events';
import { MatchRelation, MatchStatus } from './match.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';
import { PlanUsageService } from '../plans/plan-usage.service';
import { activePlan, isWoman, entitlementsFor } from '../plans/plan-entitlements';
import { dayStart } from '../plans/plan-entitlements';

@Injectable()
export class MatchesService {
  readonly matchEvents = new EventEmitter();

  private async saveAndPublishMatch(match: MatchRelation): Promise<MatchRelation> {
    const saved = await this.matchesRepository.save(match);
    // Only publish committed data; never include private profile fields.
    this.matchEvents.emit('changed', {
      id: saved.id, senderId: saved.senderId, receiverId: saved.receiverId,
      status: saved.status, createdAt: saved.createdAt, isSuperLike: saved.isSuperLike,
    });
    return saved;
  }

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
      isOnline: user.showOnlineStatus !== false && user.status === 'active' && user.isOnline,
      showOnlineStatus: user.showOnlineStatus,
      status: user.status,
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
        'sender.id', 'sender.name', 'sender.birthDate', 'sender.bio', 'sender.photos', 'sender.isOnline', 'sender.showOnlineStatus', 'sender.status',
        'receiver.id', 'receiver.name', 'receiver.birthDate', 'receiver.bio', 'receiver.photos', 'receiver.isOnline', 'receiver.showOnlineStatus', 'receiver.status',
      ]);
  }

  private async enrichMatches(matches: MatchRelation[], userId: string, includeMessages = true, lightweightPlan = false): Promise<any[]> {
    if (matches.length === 0) return [];

    // Fetch message metadata for every conversation in one query. The old code
    // executed two queries per match, which made this endpoint increasingly slow.
    const messageSummary = includeMessages ? await this.msgRepo
      .createQueryBuilder('message')
      .select('message.conversationId', 'conversationId')
      .addSelect('MAX(message.createdAt)', 'lastMessageTime')
      .addSelect(
        'SUM(CASE WHEN message.receiverId = :userId AND message.isRead = :isRead THEN 1 ELSE 0 END)',
        'unreadCount',
      )
      .addSelect((subQuery) => subQuery
        .select('latest.content')
        .from(Message, 'latest')
        .where('latest.conversationId = message.conversationId')
        .orderBy('latest.createdAt', 'DESC')
        .limit(1), 'lastMessage')
      .where('message.conversationId IN (:...matchIds)', { matchIds: matches.map((match) => match.id) })
      .setParameters({ userId, isRead: false })
      .groupBy('message.conversationId')
      .getRawMany<{ conversationId: string; lastMessageTime: string | Date | null; unreadCount: string; lastMessage: string | null }>() : [];

    const summaries = new Map(messageSummary.map((row) => [row.conversationId, row]));
    const enriched = matches.map((match) => {
      const summary = summaries.get(match.id);
      return {
        ...match,
        sender: this.serializeUser(match.sender),
        receiver: this.serializeUser(match.receiver),
        lastMessage: summary?.lastMessage || 'No messages yet.',
        lastMessageTime: summary?.lastMessageTime || match.createdAt,
        unreadCount: Number(summary?.unreadCount || 0),
      };
    });
    if (!enriched.some(match => match.status === MatchStatus.MATCHED)) {
      return enriched.map(match => ({ ...match, locked: false }));
    }
    const { limits } = !includeMessages || lightweightPlan ? await this.dashboardPlan(userId) : await this.planUsage.get(userId);

    // The first matches a member unlocked remain open. Newer matches above the
    // plan allowance are retained but locked, rather than displacing an older
    // conversation or rejecting the match entirely.
    // Use the complete active-match set so Matches and Messages unlock the
    // exact same conversations even when the dashboard response is paginated.
    const unlockedRows = limits.matches === Number.MAX_SAFE_INTEGER
      ? enriched.filter((match) => match.status === MatchStatus.MATCHED).map((match) => ({ id: match.id }))
      : await this.matchesRepository.createQueryBuilder('candidate')
        .select(['candidate.id'])
        .where('(candidate.senderId = :userId OR candidate.receiverId = :userId)', { userId })
        .andWhere('candidate.status = :status', { status: MatchStatus.MATCHED })
        .andWhere(`COALESCE(candidate.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')`)
        .orderBy('candidate.updatedAt', 'ASC')
        .addOrderBy('candidate.id', 'ASC')
        .take(limits.matches)
        .getMany();
    const allowedMatchedIds = new Set(unlockedRows.map((match) => match.id));
    const sorted = includeMessages ? enriched.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
    ) : enriched;
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

  async presenceRecipients(userId: string) {
    return this.matchesRepository.createQueryBuilder('relation')
      .select(['relation.id', 'relation.senderId', 'relation.receiverId'])
      .where('(relation.senderId = :userId OR relation.receiverId = :userId)', { userId })
      .andWhere('relation.status = :status', { status: MatchStatus.MATCHED })
      .getMany();
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

  private filterQuery(userId: string, filter?: 'active' | 'sent' | 'received' | 'blocked' | 'messages') {
    const query = this.matchesRepository.createQueryBuilder('match')
      .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId });

    if (filter === 'messages') {
      query
        .andWhere(
          '(match.status IN (:...messageStatuses) OR EXISTS (SELECT 1 FROM messages history WHERE history.conversationId = match.id))',
          { messageStatuses: [MatchStatus.MATCHED, MatchStatus.BLOCKED] },
        )
        .andWhere("COALESCE(match.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')");
    } else if (filter === 'active') {
      query
        .andWhere('match.status = :status', { status: MatchStatus.MATCHED })
        .andWhere("COALESCE(match.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')");
    } else if (filter === 'sent') {
      query.andWhere('match.status = :status AND match.senderId = :userId', { status: MatchStatus.PENDING, userId });
    } else if (filter === 'received') {
      query.andWhere('match.status = :status AND match.receiverId = :userId', { status: MatchStatus.PENDING, userId });
    } else if (filter === 'blocked') {
      query.andWhere(
        'match.status = :status AND (match.blockedByUserId = :userId OR (match.blockedByUserId IS NULL AND match.senderId = :userId))',
        { status: MatchStatus.BLOCKED, userId },
      );
    } else {
      query.andWhere('match.status IN (:...statuses)', {
        statuses: [MatchStatus.MATCHED, MatchStatus.PENDING, MatchStatus.BLOCKED],
      });
    }

    return query;
  }

  async dashboardPage(userId: string, filter: 'active' | 'sent' | 'received' | 'blocked', page = 0, pageSize = 20, kind?: 'normal' | 'super') {
    if (!['active', 'sent', 'received', 'blocked'].includes(filter)) throw new BadRequestException('Invalid match tab.');
    page = Number.isFinite(page) ? Math.min(1_000_000, Math.max(0, Math.trunc(page))) : 0;
    pageSize = Number.isFinite(pageSize) ? Math.min(100, Math.max(1, Math.trunc(pageSize))) : 20;
    const query = this.filterQuery(userId, filter);
    if (filter === 'sent' && kind) query.andWhere('match.isSuperLike = :isSuperLike', { isSuperLike: kind === 'super' });
    // Page the small relation rows BEFORE fetching profiles or evaluating access.
    const rows = await query.orderBy('match.createdAt', 'DESC').addOrderBy('match.id', 'DESC')
      .take(pageSize + 1).skip(page * pageSize).getMany();
    const hasMore = rows.length > pageSize;
    const matches = rows.slice(0, pageSize);
    if (!matches.length) return { items: [], page, pageSize, hasMore };
    const peerIds = [...new Set(matches.map(match => match.senderId === userId ? match.receiverId : match.senderId))];
    // Only the counterparty and their first photo are needed on a dashboard card.
    const profiles = await this.userRepo.createQueryBuilder('peer')
      .select('peer.id', 'id').addSelect('peer.name', 'name').addSelect('peer.birthDate', 'birthDate')
      .addSelect('peer.bio', 'bio').addSelect('peer.status', 'status')
      .addSelect('peer.isOnline', 'isOnline').addSelect('peer.showOnlineStatus', 'showOnlineStatus')
      .addSelect("JSON_UNQUOTE(JSON_EXTRACT(peer.photos, '$[0]'))", 'photo')
      .where('peer.id IN (:...peerIds)', { peerIds }).getRawMany();
    const peers = new Map(profiles.map(row => [row.id, this.userRepo.create({
      id: row.id, name: row.name, birthDate: row.birthDate, bio: row.bio, status: row.status,
      isOnline: Boolean(Number(row.isOnline)), showOnlineStatus: row.showOnlineStatus == null || Boolean(Number(row.showOnlineStatus)),
      photos: row.photo && row.photo !== 'null' ? [row.photo] : [],
    })]));
    for (const match of matches) {
      if (match.senderId !== userId) match.sender = peers.get(match.senderId)!;
      if (match.receiverId !== userId) match.receiver = peers.get(match.receiverId)!;
    }
    const enriched = await this.enrichMatches(matches, userId, false);
    const items = filter === 'received' ? await this.applyReceivedAccess(enriched, userId, true) : enriched;
    return { items, page, pageSize, hasMore };
  }

  async findForFilter(
    userId: string,
    filter?: 'active' | 'sent' | 'received' | 'blocked' | 'messages',
    limit = 12,
    offset = 0,
    compact = false,
  ): Promise<any[]> {
    const query = this.filterQuery(userId, filter);
    if (!compact) query.leftJoin('match.sender', 'sender').leftJoin('match.receiver', 'receiver').addSelect([
      'sender.id', 'sender.name', 'sender.birthDate', 'sender.bio', 'sender.photos', 'sender.isOnline', 'sender.showOnlineStatus', 'sender.status',
      'receiver.id', 'receiver.name', 'receiver.birthDate', 'receiver.bio', 'receiver.photos', 'receiver.isOnline', 'receiver.showOnlineStatus', 'receiver.status',
    ]);

    // Each dashboard tab renders a small page only. Loading every related
    // profile (and its photo) made accounts with many requests unnecessarily
    // slow to open.
    const matches = await query
      .orderBy('match.createdAt', 'DESC')
      .addOrderBy('match.id', 'DESC')
      .take(Math.min(Math.max(limit, 1), 100))
      .skip(Math.max(offset, 0))
      .getMany();
    const enriched = await this.enrichMatches(matches, userId, filter === 'active' || filter === 'messages' || !filter, compact);
    if (filter !== 'received') return enriched;
    return this.applyReceivedAccess(enriched, userId, compact);
  }

  private async dashboardPlan(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'gender', 'plan', 'planExpiresAt'] });
    if (!user) throw new NotFoundException('User not found.');
    return { user, limits: entitlementsFor(user) };
  }

  private async applyReceivedAccess(enriched: any[], userId: string, lightweight = false) {
    if (!enriched.length) return enriched;
    const { user, limits } = lightweight ? await this.dashboardPlan(userId) : await this.planUsage.get(userId);
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
    const visible = "COALESCE(match.hiddenFromChatForUserIds, '') NOT LIKE CONCAT('%', CHAR(34), :userId, CHAR(34), '%')";
    const row = await this.matchesRepository.createQueryBuilder('match')
      .select(`SUM(CASE WHEN match.status = :matched AND ${visible} THEN 1 ELSE 0 END)`, 'active')
      .addSelect('SUM(CASE WHEN match.status = :pending AND match.senderId = :userId THEN 1 ELSE 0 END)', 'sent')
      .addSelect('SUM(CASE WHEN match.status = :pending AND match.senderId = :userId AND match.isSuperLike = true THEN 1 ELSE 0 END)', 'sentSuper')
      .addSelect('SUM(CASE WHEN match.status = :pending AND match.receiverId = :userId THEN 1 ELSE 0 END)', 'received')
      .addSelect('SUM(CASE WHEN match.status = :blocked AND (match.blockedByUserId = :userId OR (match.blockedByUserId IS NULL AND match.senderId = :userId)) THEN 1 ELSE 0 END)', 'blocked')
      .where('(match.senderId = :userId OR match.receiverId = :userId)', { userId })
      .setParameters({ matched: MatchStatus.MATCHED, pending: MatchStatus.PENDING, blocked: MatchStatus.BLOCKED })
      .getRawOne();
    return { active: Number(row?.active || 0), sent: Number(row?.sent || 0), sentSuper: Number(row?.sentSuper || 0), received: Number(row?.received || 0), blocked: Number(row?.blocked || 0) };
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
      return this.saveAndPublishMatch(match);
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
        return this.saveAndPublishMatch(existing);
      }

      existing.senderId = senderId;
      existing.receiverId = receiverId;
      existing.status = MatchStatus.PENDING;
      existing.isSuperLike = existing.isSuperLike || isSuperLike;
      return this.saveAndPublishMatch(existing);
    }

    return this.saveAndPublishMatch(
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
      return this.saveAndPublishMatch(match);
    }
    return null;
  }

  async blockMatch(id: string, blockerUserId: string): Promise<MatchRelation> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Match not found.');
    if (match.senderId !== blockerUserId && match.receiverId !== blockerUserId) {
      throw new ForbiddenException('You are not part of this match.');
    }
    if (match.status === MatchStatus.BLOCKED) {
      if (match.blockedByUserId === blockerUserId || (!match.blockedByUserId && match.senderId === blockerUserId)) return match;
      throw new ForbiddenException('This user has blocked this conversation.');
    }

    match.statusBeforeBlock = match.status;
    match.blockedByUserId = blockerUserId;
    match.status = MatchStatus.BLOCKED;
    return this.saveAndPublishMatch(match);
  }

  async unblockMatch(id: string, userId: string): Promise<MatchRelation> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Match not found.');
    if (match.senderId !== userId && match.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this match.');
    }
    if (match.status !== MatchStatus.BLOCKED) return match;

    const blockerId = match.blockedByUserId || match.senderId;
    if (blockerId !== userId) throw new ForbiddenException('Only the user who blocked this conversation can unblock it.');

    match.status = match.statusBeforeBlock || MatchStatus.MATCHED;
    match.blockedByUserId = null;
    match.statusBeforeBlock = null;
    return this.saveAndPublishMatch(match);
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
      return this.saveAndPublishMatch(match);
    }

    match.status = MatchStatus.DECLINED;
    return this.saveAndPublishMatch(match);
  }

  async delete(id: string, userId?: string): Promise<{ deleted: boolean }> {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (match) {
      if (userId && match.senderId !== userId && match.receiverId !== userId) {
        throw new ForbiddenException('You are not part of this match.');
      }
      const removed = { id: match.id, senderId: match.senderId, receiverId: match.receiverId, status: 'DELETED', createdAt: match.createdAt };
      await this.matchesRepository.remove(match);
      this.matchEvents.emit('changed', removed);
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

    const removed = { id: match.id, senderId: match.senderId, receiverId: match.receiverId, status: 'DELETED', createdAt: match.createdAt };
    await this.matchesRepository.remove(match);
    this.matchEvents.emit('changed', removed);
    return { deleted: true };
  }

  async undoSwipe(senderId: string, receiverId: string): Promise<{ deleted: boolean }> {
    const match = await this.matchesRepository.findOne({ where: { senderId, receiverId } });
    if (!match) throw new NotFoundException('Swipe not found.');
    if (match.status === MatchStatus.MATCHED || match.status === MatchStatus.BLOCKED) {
      throw new BadRequestException('This swipe can no longer be undone.');
    }

    await this.planUsage.assertAndRecord(senderId, 'rewindsPerMonth', 'Profile rewind', receiverId);

    const removed = { id: match.id, senderId: match.senderId, receiverId: match.receiverId, status: 'DELETED', createdAt: match.createdAt };
    await this.matchesRepository.remove(match);
    this.matchEvents.emit('changed', removed);
    return { deleted: true };
  }

}
