import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, IsNull } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { User } from '../users/user.entity';
import { isWoman } from '../plans/plan-entitlements';
import { CoinTransaction } from '../users/coin-transaction.entity';
import { Referral, ReferralActivity, ReferralCode, ReferralReward } from './referral.entity';

import { REFERRAL_REWARD_PAISE, REFERRAL_HOLD_DAYS, REFERRAL_MIN_WITHDRAWAL_PAISE } from './referral-policy';
const HOLD_MS = REFERRAL_HOLD_DAYS * 86400000;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);
  private readonly activityCache = new Map<string, string>();
  constructor(private readonly db: DataSource) {}

  async eligible(manager: EntityManager, id: string) {
    const user = await manager.getRepository(User).findOneBy({ id });
    if (!user || user.role !== 'user' || user.status !== 'active' || !isWoman(user)) {
      throw new ForbiddenException('Referral rewards are available to women members only.');
    }
    return user;
  }

  async validateInvite(code: string, gender?: string, manager = this.db.manager) {
    if (!isWoman({ gender: gender || '' })) throw new BadRequestException('This referral is for women only. Remove the invitation to register without a referral.');
    const invite = await manager.getRepository(ReferralCode).findOneBy({ code });
    if (!invite) throw new BadRequestException('This referral link is invalid.');
    await this.eligible(manager, invite.userId);
    return invite;
  }

  async attachToSignup(manager: EntityManager, code: string, user: User) {
    const invite = await this.validateInvite(code, user.gender, manager);
    if (invite.userId === user.id) throw new BadRequestException('You cannot refer yourself.');
    if (!user.emailVerifiedAt) throw new BadRequestException('Verify your email to earn referral rewards.');
    const now = new Date();
    const referral = manager.getRepository(Referral).create({ id: randomUUID(), referrerId: invite.userId, referredId: user.id, qualifiedAt: now });
    await manager.getRepository(Referral).insert(referral);
    await this.initialRewards(manager, referral, now);
  }

  private async initialRewards(manager: EntityManager, referral: Referral, earnedAt: Date) {
    const unlockAt = new Date(earnedAt.getTime() + HOLD_MS);
    await manager.getRepository(ReferralReward).insert([
      { id: randomUUID(), referralId: referral.id, userId: referral.referrerId, kind: 'invitation', amountPaise: REFERRAL_REWARD_PAISE, unlockAt },
      { id: randomUUID(), referralId: referral.id, userId: referral.referredId, kind: 'welcome', amountPaise: REFERRAL_REWARD_PAISE, unlockAt },
    ]);
  }

  async dismissWelcome(userId: string) {
    await this.eligible(this.db.manager, userId);
    await this.db.getRepository(User).update({ id: userId }, { referralWelcomePending: false });
    return { success: true };
  }

  async accounts(userId: string, page = 0) {
    await this.eligible(this.db.manager, userId);
    page = Number.isFinite(page) ? Math.min(1000000, Math.max(0, Math.trunc(page))) : 0;
    const rows = await this.db.getRepository(Referral).find({ where: { referrerId: userId }, order: { createdAt: 'DESC', id: 'DESC' }, skip: page * 50, take: 51 });
    const referrals = rows.slice(0, 50);
    const names = referrals.length ? await this.db.getRepository(User).find({ where: { id: In(referrals.map(row => row.referredId)) }, select: ['id', 'name'] }) : [];
    return { items: referrals.map(row => ({ id: row.id, memberName: names.find(user => user.id === row.referredId)?.name || 'Member', registeredAt: row.createdAt,
      rewardPaise: row.qualifiedAt ? REFERRAL_REWARD_PAISE : 0, unlockAt: row.qualifiedAt ? new Date(row.qualifiedAt.getTime() + HOLD_MS) : null })), hasMore: rows.length > 50, nextPage: page + 1 };
  }

  /** Called after real password/Google authentication and on authenticated app use.
   * One India-calendar activity day is recorded per invitation, across devices. */
  async recordActivity(userId: string, force = false) {
    const now = new Date();
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    if (!force && this.activityCache.get(userId) === day) return;
    try {
      await this.db.transaction(async manager => {
        const referral = await manager.getRepository(Referral).findOne({ where: { referredId: userId }, lock: { mode: 'pessimistic_write' } });
        if (!referral) return;
        const user = await manager.getRepository(User).findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } });
        if (!user || !isWoman(user) || user.role !== 'user' || user.status !== 'active' || !user.emailVerifiedAt) return;
        const inviter = await manager.getRepository(User).findOne({ where: { id: referral.referrerId }, lock: { mode: 'pessimistic_write' } });
        if (!inviter || !isWoman(inviter) || inviter.role !== 'user' || inviter.status !== 'active') return;
        const rewards = manager.getRepository(ReferralReward);
        if (!referral.qualifiedAt) {
          referral.qualifiedAt = now;
          await manager.getRepository(Referral).save(referral);
          // Complete invitations created by an earlier release, without issuing
          // a second reward for registrations already credited atomically.
          await this.initialRewards(manager, referral, now);
        }
        await manager.getRepository(ReferralActivity).createQueryBuilder().insert().values({ referralId: referral.id, activeDate: day }).orIgnore().execute();
        const activeDays = await manager.getRepository(ReferralActivity).countBy({ referralId: referral.id });
        if (activeDays >= 30 && !await rewards.existsBy({ referralId: referral.id, userId, kind: 'activity_bonus' })) {
          // The bonus belongs only to the invited woman. It shares the original
          // 30-day hold, so earning it does not restart a second 30-day lock.
          await rewards.insert({ id: randomUUID(), referralId: referral.id, userId, kind: 'activity_bonus', amountPaise: REFERRAL_REWARD_PAISE,
            unlockAt: new Date(referral.qualifiedAt.getTime() + HOLD_MS) });
        }
      });
      if (this.activityCache.size >= 10000) this.activityCache.clear();
      this.activityCache.set(userId, day);
    } catch {
      // A transient reward issue must not lock a member out; the next authenticated
      // request retries because unsuccessful attempts never enter the day cache.
      this.logger.warn('Referral activity could not be recorded; it will be retried.');
    }
  }

  async summary(userId: string) {
    await this.eligible(this.db.manager, userId);
    let code = await this.db.getRepository(ReferralCode).findOneBy({ userId });
    if (!code) {
      await this.db.getRepository(ReferralCode).createQueryBuilder().insert().values({ userId, code: randomBytes(12).toString('hex') }).orIgnore().execute();
      code = await this.db.getRepository(ReferralCode).findOneByOrFail({ userId });
    }
    const [rewards, invited, ownReferral, withdrawals] = await Promise.all([
      this.db.getRepository(ReferralReward).find({ where: { userId }, order: { createdAt: 'DESC' } }),
      this.db.getRepository(Referral).countBy({ referrerId: userId }),
      this.db.getRepository(Referral).findOneBy({ referredId: userId }),
      this.db.getRepository(CoinTransaction).find({ where: { userId, type: 'withdrawal', walletSource: 'referral' }, order: { createdAt: 'DESC' } }),
    ]);
    const now = Date.now();
    const available = rewards.filter(row => !row.withdrawalId && row.unlockAt.getTime() <= now);
    const locked = rewards.filter(row => !row.withdrawalId && row.unlockAt.getTime() > now);
    const sum = (rows: ReferralReward[]) => rows.reduce((total, row) => total + row.amountPaise, 0);
    const states = new Map(withdrawals.map(row => [row.id, row.status]));
    const accounts = await this.accounts(userId);
    const successfulReferrals = await this.db.getRepository(Referral).countBy({ referrerId: userId, qualifiedAt: Not(IsNull()) });
    return {
      code: code.code, sharePath: `/register?ref=${code.code}`, rewardPaise: REFERRAL_REWARD_PAISE, holdDays: REFERRAL_HOLD_DAYS,
      minimumWithdrawalPaise: REFERRAL_MIN_WITHDRAWAL_PAISE, successfulReferrals,
      referrals: accounts.items, referralsHasMore: accounts.hasMore, referralsNextPage: accounts.nextPage,
      availablePaise: sum(available), lockedPaise: sum(locked), totalEarnedPaise: sum(rewards), invitedCount: invited,
      pendingWithdrawalPaise: withdrawals.filter(row => row.status === 'pending').reduce((total, row) => total + (row.amountPaise || 0), 0),
      paidPaise: withdrawals.filter(row => row.status === 'completed').reduce((total, row) => total + (row.amountPaise || 0), 0),
      activeDays: ownReferral ? await this.db.getRepository(ReferralActivity).countBy({ referralId: ownReferral.id }) : null,
      bonusEarned: rewards.some(row => row.kind === 'activity_bonus'),
      rewards: rewards.slice(0, 50).map(row => ({ id: row.id, kind: row.kind, amountPaise: row.amountPaise, unlockAt: row.unlockAt, createdAt: row.createdAt,
        status: row.withdrawalId ? states.get(row.withdrawalId) === 'completed' ? 'paid' : 'withdrawal_pending' : row.unlockAt.getTime() <= now ? 'available' : 'locked' })),
      withdrawals: withdrawals.slice(0, 20).map(row => ({ id: row.id, amountPaise: row.amountPaise, status: row.status, createdAt: row.createdAt })),
    };
  }
}
