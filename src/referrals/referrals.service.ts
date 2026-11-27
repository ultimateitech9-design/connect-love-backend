import { BadRequestException, ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, IsNull } from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../users/user.entity';
import { CoinTransaction } from '../users/coin-transaction.entity';
import { Referral, ReferralActivity, ReferralCode, ReferralReward } from './referral.entity';
import { LEGACY_REFERRAL_CODE, newReferralCode } from './referral-code';

import { referralGroup, referralRewardPaise, REFERRAL_HOLD_DAYS, REFERRAL_MIN_WITHDRAWAL_PAISE, REFERRAL_WITHDRAWAL_STEP_PAISE } from './referral-policy';
const HOLD_MS = REFERRAL_HOLD_DAYS * 86400000;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);
  private readonly activityCache = new Map<string, string>();
  constructor(private readonly db: DataSource) {}

  async eligible(manager: EntityManager, id: string) {
    const user = await manager.getRepository(User).findOneBy({ id });
    if (!user || user.role !== 'user' || user.status !== 'active' || !referralGroup(user.gender)) {
      throw new ForbiddenException('Referral rewards are available to active men and women members.');
    }
    return user;
  }

  async validateInvite(code: string, gender?: string, manager = this.db.manager) {
    const invite = await manager.getRepository(ReferralCode).findOne({ where: [{ code }, { legacyCode: code }] });
    if (!invite) throw new BadRequestException('This referral link is invalid.');
    const inviter = await this.eligible(manager, invite.userId);
    // Native/Google onboarding can collect gender after creating the account.
    // Capture that invitation now, but never issue money until eligibility is known.
    if (gender?.trim() && referralGroup(inviter.gender) !== referralGroup(gender)) return null;
    return invite;
  }

  async attachToSignup(manager: EntityManager, code: string, user: User) {
    const invite = await this.validateInvite(code, user.gender, manager);
    if (!invite) return; // Different-gender signups can register without rewards.
    if (invite.userId === user.id) throw new BadRequestException('You cannot refer yourself.');
    if (!user.emailVerifiedAt) throw new BadRequestException('Verify your email to earn referral rewards.');
    const now = new Date();
    const qualified = Boolean(referralGroup(user.gender));
    const referral = manager.getRepository(Referral).create({ id: randomUUID(), referrerId: invite.userId, referredId: user.id, qualifiedAt: qualified ? now : null });
    await manager.getRepository(Referral).insert(referral);
    if (qualified) await this.initialRewards(manager, referral, now);
  }

  private async initialRewards(manager: EntityManager, referral: Referral, earnedAt: Date) {
    const member = await manager.getRepository(User).findOneByOrFail({ id: referral.referredId });
    const amountPaise = referralRewardPaise(member.gender);
    if (!amountPaise) throw new BadRequestException('This member is not eligible for referral rewards.');
    const unlockAt = new Date(earnedAt.getTime() + HOLD_MS);
    await manager.getRepository(ReferralReward).insert([
      { id: randomUUID(), referralId: referral.id, userId: referral.referrerId, kind: 'invitation', amountPaise, unlockAt },
      { id: randomUUID(), referralId: referral.id, userId: referral.referredId, kind: 'welcome', amountPaise, unlockAt },
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
    const earned = referrals.length ? await this.db.getRepository(ReferralReward).find({ where: { referralId: In(referrals.map(row => row.id)), userId, kind: 'invitation' } }) : [];
    return { items: referrals.map(row => ({ id: row.id, memberName: names.find(user => user.id === row.referredId)?.name || 'Member', registeredAt: row.createdAt,
      rewardPaise: earned.find(reward => reward.referralId === row.id)?.amountPaise || 0, unlockAt: row.qualifiedAt ? new Date(row.qualifiedAt.getTime() + HOLD_MS) : null })), hasMore: rows.length > 50, nextPage: page + 1 };
  }

  /** Called after real password/Google authentication and on authenticated app use.
   * One India-calendar activity day is recorded per invitation, across devices. */
  async recordActivity(userId: string, force = false) {
    const now = new Date();
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    if (!force && this.activityCache.get(userId) === day) return;
    try {
      const recorded = await this.db.transaction(async manager => {
        const referral = await manager.getRepository(Referral).findOne({ where: { referredId: userId }, lock: { mode: 'pessimistic_write' } });
        if (!referral) return true;
        const user = await manager.getRepository(User).findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } });
        if (!user || !referralGroup(user.gender) || user.role !== 'user' || user.status !== 'active' || !user.emailVerifiedAt) return false;
        const inviter = await manager.getRepository(User).findOne({ where: { id: referral.referrerId }, lock: { mode: 'pessimistic_write' } });
        if (!inviter || referralGroup(inviter.gender) !== referralGroup(user.gender) || inviter.role !== 'user' || inviter.status !== 'active') return false;
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
          // The bonus belongs only to the invited member. It shares the original
          // 30-day hold, so earning it does not restart a second 30-day lock.
          const welcome = await rewards.findOneByOrFail({ referralId: referral.id, userId, kind: 'welcome' });
          await rewards.insert({ id: randomUUID(), referralId: referral.id, userId, kind: 'activity_bonus', amountPaise: welcome.amountPaise,
            unlockAt: new Date(referral.qualifiedAt.getTime() + HOLD_MS) });
        }
        return true;
      });
      if (!recorded) return;
      if (this.activityCache.size >= 10000) this.activityCache.clear();
      this.activityCache.set(userId, day);
    } catch {
      // A transient reward issue must not lock a member out; the next authenticated
      // request retries because unsuccessful attempts never enter the day cache.
      this.logger.warn('Referral activity could not be recorded; it will be retried.');
    }
  }

  private async shareCode(member: User): Promise<ReferralCode> {
    const codes = this.db.getRepository(ReferralCode);
    // The DB unique constraints, not just randomness, guarantee one distinct
    // code per account, including concurrent requests and same-name members.
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await codes.findOneBy({ userId: member.id });
      if (current && !LEGACY_REFERRAL_CODE.test(current.code)) return current;
      try {
        const code = newReferralCode(member.name);
        if (current) {
          await codes.update({ userId: member.id, code: current.code }, { code, legacyCode: current.legacyCode || current.code });
        } else {
          await codes.insert({ userId: member.id, code, legacyCode: null });
        }
        const saved = await codes.findOneBy({ userId: member.id });
        if (saved && !LEGACY_REFERRAL_CODE.test(saved.code)) return saved;
      } catch (error: any) {
        if ((error?.driverError?.code || error?.code) !== 'ER_DUP_ENTRY') throw error;
      }
    }
    throw new ServiceUnavailableException('Your invitation link could not be created. Please try again.');
  }

  async summary(userId: string) {
    const member = await this.eligible(this.db.manager, userId);
    const code = await this.shareCode(member);
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
      code: code.code, sharePath: `/register?ref=${code.code}`, rewardPaise: referralRewardPaise(member.gender), referralGroup: referralGroup(member.gender), withdrawalStepPaise: REFERRAL_WITHDRAWAL_STEP_PAISE, holdDays: REFERRAL_HOLD_DAYS,
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
