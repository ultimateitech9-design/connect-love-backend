import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { createHmac } from 'node:crypto';
import sharp from 'sharp';
import { PayoutsService } from '../payouts/payouts.service';
import { Agent } from '../agents/agent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import { User } from './user.entity';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { ProfileView } from './profile-view.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { distanceBetweenKm } from '../location/distance';
import { CoinTransaction } from './coin-transaction.entity';
import { AdminWithdrawalsQueryDto } from './dto/admin-withdrawals-query.dto';
import { ReferralReward } from '../referrals/referral.entity';
import { activePlan, entitlementsFor } from '../plans/plan-entitlements';

const normalizeTags = (tags: string[]) => {
  if (!tags || !Array.isArray(tags)) return tags;
  return [...new Set(tags
    .map(t => t.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase()))
    .filter(Boolean))];
};

@Injectable()
export class UsersService {
  readonly profileVisitorEvents = new EventEmitter();
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
    @InjectRepository(ProfileView)
    private readonly profileViewRepo: Repository<ProfileView>,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepo: Repository<CoinTransaction>,
    private readonly dataSource: DataSource,
    private readonly payouts: PayoutsService,
  ) {}

  serializeUser(user: User): any {
    return {
      ...user,
      religion: user.religion,
      age: user.age,
      avatarUrl: user.avatarUrl,
      photos: user.photos || [],
      kycLivePhoto: user.kycLivePhoto,
      kycMatched: user.kycMatched,
      kycMatchScore: user.kycMatchScore,
      kycVerifiedAt: user.kycVerifiedAt,
      photosVisibleToNonMatches: true,
      interests: user.interests || [],
      personalityWords: user.personalityWords || [],
      personality: user.personalityWords || [],
      hobbies: user.hobbies || [],
      planBadge: entitlementsFor(user).verifiedBadge,
    };
  }

  async findById(id: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    return this.serializeUser(user);
  }

  async isActiveAccount(id: string): Promise<boolean> {
    return this.userRepo.existsBy({ id, status: 'active' });
  }

  async clearAllNotifications(id: string): Promise<{ clearedAt: string }> {
    const clearedAt = new Date();
    const result = await this.userRepo.update(id, { notificationsClearedAt: clearedAt });
    if (!result.affected) throw new NotFoundException('User not found.');
    return { clearedAt: clearedAt.toISOString() };
  }

  async findProfileDetails(id: string, viewerId: string): Promise<any> {
    const [user, viewer] = await Promise.all([
      this.userRepo.findOne({ where: { id } }),
      this.userRepo.findOne({ where: { id: viewerId }, select: ['id', 'locationLatitude', 'locationLongitude'] }),
    ]);
    if (!user) throw new NotFoundException('User not found.');
    const distanceKm = user.showDistance && viewer
      ? distanceBetweenKm(viewer.locationLatitude, viewer.locationLongitude, user.locationLatitude, user.locationLongitude)
      : null;

    return {
      id: user.id,
      name: user.name,
      age: user.age,
      birthDate: user.birthDate,
      gender: user.gender,
      religion: user.religion,
      profession: user.profession,
      height: user.height,
      city: user.city,
      bio: user.bio,
      interests: user.interests || [],
      personality: user.personalityWords || [],
      hobbies: user.hobbies || [],
      avatarUrl: user.avatarUrl,
      photos: user.photos || [],
      kycMatched: user.kycMatched,
      kycMatchScore: user.kycMatchScore,
      photosVisibleToNonMatches: true,
      isVerified: user.isVerified,
      planBadge: entitlementsFor(user).verifiedBadge,
      showDistance: user.showDistance,
      distanceKm,
    };
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: string, data: UpdateProfileDto): Promise<any> {
    const existingUser = await this.userRepo.findOne({ where: { id } });
    if (!existingUser) throw new NotFoundException('User not found.');

    const sanitizedData: any = { ...data };
    if (sanitizedData.photos) {
      const uniquePhotos = [...new Set(sanitizedData.photos.filter(Boolean))];
      const maxPhotos = entitlementsFor(existingUser).profilePhotos;
      if (uniquePhotos.length > maxPhotos) {
        throw new BadRequestException(`Your plan allows a maximum of ${maxPhotos} profile photos. Upgrade to add more.`);
      }
      const photosChanged = JSON.stringify(existingUser.photos || []) !== JSON.stringify(uniquePhotos);
      sanitizedData.photos = uniquePhotos;
      if (photosChanged) {
        // A verified face must never remain attached to a different photo set.
        sanitizedData.kycLivePhoto = null;
        sanitizedData.kycMatched = false;
        sanitizedData.kycMatchScore = null;
        sanitizedData.kycVerifiedAt = null;
        sanitizedData.isVerified = false;
        sanitizedData.onboardingCompleted = false;
      }
    }
    if (sanitizedData.interests) {
      sanitizedData.interests = normalizeTags(sanitizedData.interests);
    }
    if (sanitizedData.personalityWords) {
      sanitizedData.personalityWords = normalizeTags(sanitizedData.personalityWords);
    }
    if (sanitizedData.hobbies) {
      sanitizedData.hobbies = normalizeTags(sanitizedData.hobbies);
    }
    if (sanitizedData.onboardingCompleted) {
      const photos = sanitizedData.photos ?? existingUser.photos ?? [];

      if (!photos.length) {
        throw new BadRequestException('Add at least one profile photo before completing onboarding.');
      }
      // Video KYC is optional during onboarding. Successful KYC separately sets
      // kycMatched/isVerified, which controls the verified badge.
    }
    sanitizedData.photosVisibleToNonMatches = true;

    // Only update fields that are part of the DTO (safe update)
    await this.userRepo.update(id, sanitizedData as any);
    return this.findById(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    await this.userRepo.delete(id);
    return { message: `User ${user.name} deleted.` };
  }

  async removeMe(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    
    // TypeORM ON DELETE CASCADE will handle matches and messages automatically
    await this.userRepo.delete(id);

    return { message: `Your account and all associated data have been permanently deleted.` };
  }

  async exportMe(id: string): Promise<{ exportedAt: string; user: any }> {
    const user = await this.findById(id);
    return {
      exportedAt: new Date().toISOString(),
      user,
    };
  }

  async deactivateMe(id: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    await this.userRepo.update(id, {
      status: 'deactivated',
      isOnline: false,
      lastSeen: new Date(),
    });
    return { message: 'Your account has been deactivated. Sign in again whenever you want to reactivate it.' };
  }

  async visiblePresence(userId: string, isOnline: boolean, lastSeen?: Date) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'showOnlineStatus', 'status'] });
    const visible = Boolean(user?.showOnlineStatus && user.status === 'active');
    return { userId, isOnline: visible && isOnline, lastSeen: visible ? lastSeen : undefined };
  }
  async visibleOnlineUserIds(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const users = await this.userRepo.createQueryBuilder('user').select(['user.id'])
      .where('user.id IN (:...ids)', { ids })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.showOnlineStatus = :visible', { visible: true }).getMany();
    return users.map(user => user.id);
  }

  async updatePresence(userId: string, isOnline: boolean): Promise<void> {
    const updateData: Partial<User> = { isOnline };
    if (!isOnline) {
      updateData.lastSeen = new Date();
    }
    try {
      await this.userRepo.update(userId, updateData);
    } catch (error) {
      // The local recovered database may be read-only. Presence is transient
      // state, so it must not crash the API or WebSocket connection.
      console.warn('Presence update unavailable; continuing without persistence.', error);
    }
  }

  async recordProfileView(profileUserId: string, viewerUserId: string, detail = false): Promise<{ recorded: boolean }> {
    if (!viewerUserId || profileUserId === viewerUserId) return { recorded: false };
    if (detail && !await this.canViewVisitor(profileUserId, viewerUserId)) return { recorded: false };
    const profileExists = await this.userRepo.exist({ where: { id: profileUserId } });
    if (!profileExists) throw new NotFoundException('User not found.');

    // Store at most one view per viewer/profile pair per day. This keeps reloads
    // from inflating the insight while retaining a useful visit history.
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const alreadyRecorded = await this.profileViewRepo.findOne({
      where: { profileUserId, viewerUserId, createdAt: MoreThanOrEqual(since) },
      select: ['id', 'detailViewedAt'],
    });
    if (alreadyRecorded) {
      if (detail && !alreadyRecorded.detailViewedAt) {
        await this.profileViewRepo.update(alreadyRecorded.id, { detailViewedAt: new Date() });
        this.profileVisitorEvents.emit('changed', profileUserId);
        return { recorded: true };
      }
      return { recorded: false };
    }

    try {
      await this.profileViewRepo.save(this.profileViewRepo.create({ profileUserId, viewerUserId, detailViewedAt: detail ? new Date() : null }));
      if (detail) this.profileVisitorEvents.emit('changed', profileUserId);
      return { recorded: true };
    } catch (error) {
      console.warn('Profile-view analytics unavailable.', error);
      return { recorded: false };
    }
  }

  private async canViewVisitor(ownerId: string, visitorId: string) {
    const active = await this.userRepo.count({ where: { id: In([ownerId, visitorId]), status: 'active', role: 'user' } });
    if (active !== 2) return false;
    return !await this.matchRepo.createQueryBuilder('relation')
      .where("((relation.senderId = :ownerId AND relation.receiverId = :visitorId) OR (relation.receiverId = :ownerId AND relation.senderId = :visitorId)) AND relation.status = 'BLOCKED'", { ownerId, visitorId }).getExists();
  }

  async profileVisitors(ownerId: string, requestedOffset = 0, requestedLimit = 12) {
    const owner = await this.userRepo.findOne({ where: { id: ownerId, status: 'active' }, select: ['id', 'plan', 'planExpiresAt'] });
    if (!owner) throw new NotFoundException('Account not found.');
    const locked = activePlan(owner) === 'free';
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.trunc(requestedOffset)) : 0;
    const limit = Number.isFinite(requestedLimit) ? Math.min(30, Math.max(1, Math.trunc(requestedLimit))) : 12;
    const rows = await this.profileViewRepo.createQueryBuilder('view')
      .innerJoin(User, 'visitor', "visitor.id = view.viewerUserId AND visitor.status = 'active' AND visitor.role = 'user'")
      .select('view.viewerUserId', 'visitorId').addSelect('MAX(view.detailViewedAt)', 'viewedAt')
      .where('view.profileUserId = :ownerId AND view.viewerUserId <> :ownerId AND view.detailViewedAt IS NOT NULL', { ownerId })
      .andWhere("NOT EXISTS (SELECT 1 FROM matches blocked WHERE ((blocked.senderId = :ownerId AND blocked.receiverId = view.viewerUserId) OR (blocked.receiverId = :ownerId AND blocked.senderId = view.viewerUserId)) AND blocked.status = 'BLOCKED')")
      .groupBy('view.viewerUserId').orderBy('viewedAt', 'DESC').addOrderBy('view.viewerUserId', 'ASC')
      .offset(offset).limit(limit + 1).getRawMany();
    const page = rows.slice(0, limit);
    const profiles = page.length ? await this.userRepo.createQueryBuilder('visitor')
      .select(['visitor.id', 'visitor.name', 'visitor.photosVisibleToNonMatches'])
      .addSelect("JSON_UNQUOTE(JSON_EXTRACT(visitor.photos, '$[0]'))", 'photo')
      .where('visitor.id IN (:...ids)', { ids: page.map(row => row.visitorId) }).getRawAndEntities() : { entities: [], raw: [] };
    const byId = new Map(profiles.entities.map((user, index) => [user.id, { user, photo: profiles.raw[index].photo }]));
    const items: { id: string; userId?: string; name?: string; photo: string | null; viewedAt: Date }[] = [];
    for (const row of page) {
      const profile = byId.get(row.visitorId);
      if (!profile) continue;
      let photo: string | null = null;
      const source = String(profile.photo || '');
      const encoded = source.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (profile.user.photosVisibleToNonMatches && encoded) {
        try {
          let image = sharp(Buffer.from(encoded[1], 'base64'), { limitInputPixels: 40_000_000 }).rotate().resize(80, 80, { fit: 'cover' });
          if (locked) image = image.blur(14);
          photo = 'data:image/webp;base64,' + (await image.webp({ quality: 60 }).toBuffer()).toString('base64');
        } catch { /* Keep a neutral placeholder for unavailable images. */ }
      } else if (!locked && profile.user.photosVisibleToNonMatches && (/^https?:\/\//i.test(source) || /^\/[^/]/.test(source))) photo = source;
      // Never send a free member the visitor's ID, name or original photo.
      const id = createHmac('sha256', process.env.JWT_SECRET!).update(ownerId + ':' + row.visitorId).digest('hex');
      items.push({ id, ...(locked ? {} : { userId: profile.user.id, name: profile.user.name }), photo, viewedAt: new Date(row.viewedAt) });
    }
    return { locked, items, hasMore: rows.length > limit, nextOffset: offset + page.length };
  }

  async profileVisitorDetails(ownerId: string, visitorId: string) {
    const owner = await this.userRepo.findOne({ where: { id: ownerId, status: 'active' }, select: ['id', 'plan', 'planExpiresAt'] });
    if (!owner || activePlan(owner) === 'free') throw new ForbiddenException('Activate Gold or Diamond to view profile visitors.');
    const recorded = await this.profileViewRepo.createQueryBuilder('view')
      .where('view.profileUserId = :ownerId AND view.viewerUserId = :visitorId AND view.detailViewedAt IS NOT NULL', { ownerId, visitorId }).getExists();
    if (!recorded || !await this.canViewVisitor(ownerId, visitorId)) throw new NotFoundException('Visitor is unavailable.');
    const details = await this.findProfileDetails(visitorId, ownerId);
    await this.recordProfileView(visitorId, ownerId, true);
    return details;
  }

  private compatibilityScore(owner: User, other: User): number {
    const normalize = (values?: string[]) => new Set(
      (values || []).map((value) => value.trim().toLowerCase()).filter(Boolean),
    );
    const overlap = (left?: string[], right?: string[]) => {
      const a = normalize(left);
      const b = normalize(right);
      if (!a.size && !b.size) return null;
      const shared = [...a].filter((value) => b.has(value)).length;
      const total = new Set([...a, ...b]).size;
      return total ? shared / total : 0;
    };

    const tagScores = [
      overlap(owner.interests, other.interests),
      overlap(owner.personalityWords, other.personalityWords),
      overlap(owner.hobbies, other.hobbies),
    ].filter((value): value is number => value !== null);
    const tagAverage = tagScores.length
      ? tagScores.reduce((sum, value) => sum + value, 0) / tagScores.length
      : 0;
    const sameGoal = owner.relationshipGoal && other.relationshipGoal
      && owner.relationshipGoal.toLowerCase() === other.relationshipGoal.toLowerCase() ? 1 : 0;
    const sameCity = owner.city && other.city
      && owner.city.toLowerCase() === other.city.toLowerCase() ? 1 : 0;
    const sameReligion = owner.religion && other.religion
      && owner.religion.toLowerCase() === other.religion.toLowerCase() ? 1 : 0;

    return Math.round((tagAverage * 0.7 + sameGoal * 0.15 + sameCity * 0.1 + sameReligion * 0.05) * 100);
  }

  async getProfileInsights(userId: string): Promise<{
    profileViews7d: number;
    likesReceived: number;
    compatibilityAverage: number | null;
  }> {
    const owner = await this.userRepo.findOne({ where: { id: userId } });
    if (!owner) throw new NotFoundException('User not found.');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const viewsResult = await this.profileViewRepo
      .createQueryBuilder('view')
      .select('COUNT(*)', 'count')
      .where('view.profileUserId = :userId', { userId })
      .andWhere('view.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .getRawOne();

    const receivedLikes = await this.matchRepo.find({
      where: [
        { receiverId: userId, status: MatchStatus.PENDING },
        { receiverId: userId, status: MatchStatus.MATCHED },
      ],
      select: ['senderId'],
    });
    const likerIds = [...new Set(receivedLikes.map((like) => like.senderId))];
    const likers = likerIds.length
      ? await this.userRepo.createQueryBuilder('user')
        .where('user.id IN (:...likerIds)', { likerIds })
        .getMany()
      : [];
    const scores = likers.map((liker) => this.compatibilityScore(owner, liker));

    return {
      profileViews7d: Number(viewsResult?.count || 0),
      likesReceived: likerIds.length,
      compatibilityAverage: scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null,
    };
  }

  async rechargeCoins(userId: string, amount: number): Promise<{ coinBalance: number }> {
    throw new BadRequestException('Direct coin credit is disabled. Complete payment through Razorpay checkout.');
  }

  async spendCoins(userId: string, amount: number): Promise<{ coinBalance: number; earnedCoinBalance: number }> {
    const coins = Number(amount);
    if (!Number.isInteger(coins) || coins < 1) {
      throw new BadRequestException('Invalid coin amount.');
    }
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      if (!user || user.coinBalance + user.earnedCoinBalance < coins) throw new BadRequestException('Not enough coins. Please recharge your wallet.');
      this.deductRechargeFirst(user, coins);
      await manager.getRepository(User).save(user);
      await manager.getRepository(CoinTransaction).save(manager.getRepository(CoinTransaction).create({
        type: 'theme', status: 'completed', userId, senderId: userId, receiverId: null,
        grossCoins: coins, userCoins: 0, platformCoins: coins, label: 'Premium theme unlock', payoutAccount: null,
      }));
      return { coinBalance: user.coinBalance, earnedCoinBalance: user.earnedCoinBalance };
    });
  }

  private deductRechargeFirst(user: User, coins: number) {
    const rechargeCoinsUsed = Math.min(user.coinBalance || 0, coins);
    const earnedCoinsUsed = coins - rechargeCoinsUsed;
    user.coinBalance -= rechargeCoinsUsed;
    user.earnedCoinBalance -= earnedCoinsUsed;
  }

  async sendGift(userId: string, receiverId: string, amount: number, label?: string) {
    const coins = Number(amount);
    if (!receiverId || receiverId === userId) throw new BadRequestException('Choose another user to receive this gift.');
    if (!Number.isInteger(coins) || coins < 1) throw new BadRequestException('Invalid gift amount.');
    return this.dataSource.transaction(async (manager) => {
      const users = await manager.getRepository(User).find({
        where: { id: In([userId, receiverId]) },
        lock: { mode: 'pessimistic_write' },
      });
      const sender = users.find((user) => user.id === userId);
      const receiver = users.find((user) => user.id === receiverId);
      if (!sender || !receiver) throw new NotFoundException('Gift sender or receiver was not found.');
      if (sender.coinBalance + sender.earnedCoinBalance < coins) throw new BadRequestException('Not enough coins. Please recharge your wallet.');
      const receiverCoins = Math.floor(coins * 0.8);
      const platformCoins = coins - receiverCoins;
      this.deductRechargeFirst(sender, coins);
      receiver.earnedCoinBalance += receiverCoins;
      await manager.getRepository(User).save([sender, receiver]);
      await manager.getRepository(CoinTransaction).save(manager.getRepository(CoinTransaction).create({
        type: 'gift', status: 'completed', userId, senderId: userId, receiverId,
        grossCoins: coins, userCoins: receiverCoins, platformCoins,
        label: String(label || 'Gift').slice(0, 120), payoutAccount: null,
      }));
      return { coinBalance: sender.coinBalance, earnedCoinBalance: sender.earnedCoinBalance, receiverCoins, platformCoins };
    });
  }

  async requestWithdrawal(userId: string, amount: number, payoutAccount: string) {
    throw new BadRequestException('Use the secure wallet payout endpoint for withdrawals.');
  }

  async getCoinTransactions() {
    const rows = await this.coinTransactionRepo.find({ order: { createdAt: 'DESC' }, take: 1000 });
    const ids = [...new Set(rows.flatMap((row) => [row.userId, row.senderId, row.receiverId]).filter((id): id is string => Boolean(id)))];
    const users = ids.length ? await this.userRepo.find({ select: ['id', 'name', 'email', 'phone', 'gender', 'birthDate', 'city', 'profession'], where: { id: In(ids) } }) : [];
    const names = new Map(users.map((user) => [user.id, {
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      birthDate: user.birthDate,
      city: user.city,
      profession: user.profession,
    }]));
    const agentIds = [...new Set(rows.map((row) => row.agentId).filter((id): id is string => Boolean(id)))];
    const agents = agentIds.length ? await this.dataSource.getRepository(Agent).find({ select: ['id', 'name', 'email'], where: { id: In(agentIds) } }) : [];
    const agentById = new Map(agents.map((agent) => [agent.id, { name: agent.name, email: agent.email }]));
    return rows.map((row) => ({
      ...row,
      agent: row.agentId ? agentById.get(row.agentId) || null : null,
      user: row.userId ? names.get(row.userId) || null : null,
      sender: row.senderId ? names.get(row.senderId) || null : null,
      receiver: row.receiverId ? names.get(row.receiverId) || null : null,
    }));
  }

  async adminWithdrawals(query: AdminWithdrawalsQueryDto) {
    const page = query.page || 1, limit = query.limit || 25;
    const configuredValue = Number(process.env.COIN_WITHDRAWAL_VALUE_PAISE || 100);
    const valuePaise = Number.isInteger(configuredValue) && configuredValue > 0 ? configuredValue : 100;
    const base = this.coinTransactionRepo.createQueryBuilder('tx')
      .leftJoin(User, 'member', 'member.id = tx.userId')
      .leftJoin(Agent, 'agent', 'agent.id = tx.agentId')
      .where('tx.type = :type', { type: 'withdrawal' });
    if (query.source && query.source !== 'all') base.andWhere('tx.walletSource = :source', { source: query.source });
    if (query.search?.trim()) base.andWhere(`(LOCATE(:search, tx.id) > 0 OR LOCATE(:search, member.name) > 0 OR LOCATE(:search, member.email) > 0
      OR LOCATE(:search, member.phone) > 0 OR LOCATE(:search, agent.name) > 0 OR LOCATE(:search, agent.email) > 0 OR LOCATE(:search, tx.payoutAccount) > 0)`, { search: query.search.trim() });
    const amountSql = `COALESCE(NULLIF(tx.amountPaise, 0), tx.grossCoins * ${valuePaise})`;
    const totals = await base.clone().select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN tx.status = 'pending' THEN 1 ELSE 0 END)", 'pending')
      .addSelect("SUM(CASE WHEN tx.status = 'completed' THEN 1 ELSE 0 END)", 'paid')
      .addSelect("SUM(CASE WHEN tx.status = 'rejected' THEN 1 ELSE 0 END)", 'rejected')
      .addSelect(`SUM(CASE WHEN tx.status = 'pending' THEN ${amountSql} ELSE 0 END)`, 'pendingPaise').getRawOne();
    const scoped = base.clone();
    if (query.status && query.status !== 'all') scoped.andWhere('tx.status = :status', { status: query.status });
    const [rows, total] = await scoped.orderBy("CASE WHEN tx.status = 'pending' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('tx.createdAt', 'DESC').addOrderBy('tx.id', 'DESC').offset((page - 1) * limit).limit(limit).getManyAndCount();
    const ids = [...new Set(rows.map(row => row.userId).filter((id): id is string => Boolean(id)))];
    const members = ids.length ? await this.userRepo.createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.phone', 'u.gender', 'u.birthDate', 'u.city', 'u.profession', 'u.status'])
      .where('u.id IN (:...ids)', { ids }).getMany() : [];
    // Return only the primary photo for this small page, not every full-size image.
    const photos = ids.length ? await this.userRepo.createQueryBuilder('u').select('u.id', 'id')
      .addSelect("JSON_UNQUOTE(JSON_EXTRACT(u.photos, '$[0]'))", 'photo').where('u.id IN (:...ids)', { ids }).getRawMany() : [];
    const agentIds = [...new Set(rows.map(row => row.agentId).filter((id): id is string => Boolean(id)))];
    const agents = agentIds.length ? await this.dataSource.getRepository(Agent).find({ where: { id: In(agentIds) }, select: ['id', 'name', 'email'] }) : [];
    return { page, limit, total, hasMore: page * limit < total,
      summary: { total: Number(totals.total || 0), pending: Number(totals.pending || 0), paid: Number(totals.paid || 0), rejected: Number(totals.rejected || 0), pendingPaise: Number(totals.pendingPaise || 0) },
      items: rows.map(row => {
        const member = members.find(user => user.id === row.userId);
        let payout: Record<string, string> = {};
        try { const parsed = row.payoutDetails ? JSON.parse(row.payoutDetails) : {}; if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payout = parsed; } catch {}
        // Older withdrawals stored just one account string. Keep it visible
        // without borrowing details from a different, subsequently saved account.
        if (!payout.method && row.payoutAccount) {
          if (row.payoutAccount.includes('@')) payout = { method: 'upi', upiId: row.payoutAccount };
          else payout = { method: 'bank', accountNumber: row.payoutAccount };
        }
        const photo = photos.find(user => user.id === row.userId)?.photo;
        return { id: row.id, status: row.status, walletSource: row.walletSource || 'coins', coins: row.grossCoins,
          amountPaise: row.amountPaise && row.amountPaise > 0 ? row.amountPaise : row.grossCoins * valuePaise,
          amountEstimated: !(row.amountPaise && row.amountPaise > 0), createdAt: row.createdAt, label: row.label,
          user: member ? { id: member.id, name: member.name, email: member.email, phone: member.phone, gender: member.gender,
            age: member.age, city: member.city, profession: member.profession, status: member.status, photo: photo && photo !== 'null' ? photo : null } : null,
          agent: agents.find(agent => agent.id === row.agentId) || null,
          payout: { method: payout.method || null, accountHolder: payout.accountHolder || null, bankName: payout.bankName || null,
            accountNumber: payout.accountNumber || null, ifsc: payout.ifsc || null, upiId: payout.upiId || null },
        };
      }),
    };
  }

  async creditGiftCoins(userId: string, amount: number, note: string, adminId: string) {
    const targetId = userId.trim();
    const coins = Number(amount);
    if (!targetId) throw new BadRequestException('Select a user to receive coins.');
    if (!Number.isInteger(coins) || coins < 1 || coins > 1000000) {
      throw new BadRequestException('Enter a whole coin amount between 1 and 1,000,000.');
    }

    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: targetId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user || user.role !== 'user') throw new NotFoundException('Member account was not found.');

      user.coinBalance = Number(user.coinBalance || 0) + coins;
      await userRepository.save(user);
      await manager.getRepository(CoinTransaction).save(manager.getRepository(CoinTransaction).create({
        type: 'admin_credit',
        status: 'completed',
        userId: user.id,
        senderId: adminId || null,
        receiverId: user.id,
        grossCoins: coins,
        userCoins: coins,
        platformCoins: 0,
        label: (note.trim() ? `Super Admin credit: ${note.trim()}` : 'Super Admin gift coin credit').slice(0, 120),
        payoutAccount: null,
      }));

      return {
        success: true,
        coinsAdded: coins,
        coinBalance: user.coinBalance,
        user: { id: user.id, name: user.name, email: user.email },
      };
    });
  }

  async updateWithdrawalStatus(id: string, status: 'completed' | 'rejected') {
    if (status !== 'completed' && status !== 'rejected') throw new BadRequestException('Invalid withdrawal status.');
    const updated = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(CoinTransaction);
      const transaction = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!transaction || transaction.type !== 'withdrawal') throw new NotFoundException('Withdrawal request not found.');
      if (transaction.status !== 'pending') throw new BadRequestException('This withdrawal request is already processed.');
      if (status === 'rejected' && transaction.walletSource === 'referral') {
        await manager.getRepository(ReferralReward).update({ withdrawalId: transaction.id }, { withdrawalId: null });
      } else if (status === 'rejected' && transaction.userId) {
        const user = await manager.getRepository(User).findOne({ where: { id: transaction.userId }, lock: { mode: 'pessimistic_write' } });
        if (user) {
          user.earnedCoinBalance += transaction.grossCoins;
          await manager.getRepository(User).save(user);
        }
      } else if (status === 'rejected' && transaction.agentId) {
        const agent = await manager.getRepository(Agent).findOne({ where: { id: transaction.agentId }, lock: { mode: 'pessimistic_write' } });
        if (agent) {
          agent.earnedCoinBalance += transaction.grossCoins;
          await manager.getRepository(Agent).save(agent);
        }
      }
      transaction.status = status;
      return repository.save(transaction);
    });
    // Tell the member or agent; does not block or fail the status change.
    void this.payouts.notifyWithdrawalStatus(updated.id);
    return updated;
  }
}
