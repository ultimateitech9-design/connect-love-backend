import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import { User } from './user.entity';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { ProfileView } from './profile-view.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { distanceBetweenKm } from '../location/distance';
import { CoinTransaction } from './coin-transaction.entity';
import { entitlementsFor } from '../plans/plan-entitlements';

const normalizeTags = (tags: string[]) => {
  if (!tags || !Array.isArray(tags)) return tags;
  return [...new Set(tags
    .map(t => t.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase()))
    .filter(Boolean))];
};

@Injectable()
export class UsersService {
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

  async findProfileDetails(id: string, viewerId: string): Promise<any> {
    const [user, viewer] = await Promise.all([
      this.userRepo.findOne({ where: { id } }),
      this.userRepo.findOne({ where: { id: viewerId }, select: ['id', 'locationLatitude', 'locationLongitude'] }),
    ]);
    if (!user) throw new NotFoundException('User not found.');
    await this.recordProfileView(id, viewerId);
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
      const currentPhotos = existingUser.photos || [];
      for (let index = 0; index < Math.min(2, currentPhotos.length); index += 1) {
        if (uniquePhotos[index] !== currentPhotos[index]) {
          throw new BadRequestException('Your first 2 profile photos are fixed and cannot be deleted or replaced.');
        }
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
      status: 'suspended',
      isOnline: false,
      lastSeen: new Date(),
    });
    return { message: 'Your account has been deactivated. Contact support when you want to reactivate it.' };
  }

  async updatePresence(userId: string, isOnline: boolean): Promise<void> {
    const updateData: Partial<User> = { isOnline };
    if (!isOnline) {
      updateData.lastSeen = new Date();
    }
    await this.userRepo.update(userId, updateData);
  }

  private async recordProfileView(profileUserId: string, viewerUserId: string): Promise<void> {
    if (!viewerUserId || profileUserId === viewerUserId) return;

    // Store at most one view per viewer/profile pair per day. This keeps reloads
    // from inflating the insight while retaining a useful visit history.
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const alreadyRecorded = await this.profileViewRepo.findOne({
      where: { profileUserId, viewerUserId, createdAt: MoreThanOrEqual(since) },
      select: ['id'],
    });
    if (!alreadyRecorded) {
      await this.profileViewRepo.save(this.profileViewRepo.create({ profileUserId, viewerUserId }));
    }
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
      .select('COUNT(DISTINCT view.viewerUserId)', 'count')
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
    const users = ids.length ? await this.userRepo.find({ select: ['id', 'name', 'email'], where: { id: In(ids) } }) : [];
    const names = new Map(users.map((user) => [user.id, { name: user.name, email: user.email }]));
    return rows.map((row) => ({
      ...row,
      user: row.userId ? names.get(row.userId) || null : null,
      sender: row.senderId ? names.get(row.senderId) || null : null,
      receiver: row.receiverId ? names.get(row.receiverId) || null : null,
    }));
  }

  async updateWithdrawalStatus(id: string, status: 'completed' | 'rejected') {
    if (status !== 'completed' && status !== 'rejected') throw new BadRequestException('Invalid withdrawal status.');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(CoinTransaction);
      const transaction = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!transaction || transaction.type !== 'withdrawal') throw new NotFoundException('Withdrawal request not found.');
      if (transaction.status !== 'pending') throw new BadRequestException('This withdrawal request is already processed.');
      if (status === 'rejected' && transaction.userId) {
        const user = await manager.getRepository(User).findOne({ where: { id: transaction.userId }, lock: { mode: 'pessimistic_write' } });
        if (user) {
          user.earnedCoinBalance += transaction.grossCoins;
          await manager.getRepository(User).save(user);
        }
      }
      transaction.status = status;
      return repository.save(transaction);
    });
  }
}
