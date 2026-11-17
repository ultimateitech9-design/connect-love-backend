import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Agent } from '../agents/agent.entity';
import { CoinTransaction } from '../users/coin-transaction.entity';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { PlatformSetting } from '../platform/platform-setting.entity';
import { VideoCall, VideoCallType } from '../messages/video-call.entity';
import { dayStart, monthStart } from '../plans/plan-entitlements';

/** Super-admin editable rules for paid direct calls (platform_settings 'direct_calls'). */
export type DirectCallSettings = {
  enabled: boolean;
  videoRatePerMinute: number;
  audioRatePerMinute: number;
  freeCallsPerMonth: number;
  freeVideoSeconds: number;
  freeAudioSeconds: number;
  /** Share of every charged minute for the receiver; the receiver's agent gets agentPercent. */
  receiverPercent: number;
  agentPercent: number;
  /** Direct calls one caller may start to the same person per day (spam guard). */
  maxCallsPerReceiverPerDay: number;
  /** Coin packs offered in the upgrade popup (1 coin = ₹1). */
  packs: number[];
};

export const DEFAULT_DIRECT_CALL_SETTINGS: DirectCallSettings = {
  enabled: true,
  videoRatePerMinute: 20,
  audioRatePerMinute: 10,
  freeCallsPerMonth: 7,
  freeVideoSeconds: 30,
  freeAudioSeconds: 20,
  receiverPercent: 50,
  agentPercent: 10,
  maxCallsPerReceiverPerDay: 5,
  packs: [299, 499, 999],
};

const SETTINGS_KEY = 'direct_calls';

/** Error code the client uses to open the upgrade popup. */
export const UPGRADE_REQUIRED = 'UPGRADE_REQUIRED';

export type DirectCallPlan = { isFreeTrial: boolean; ratePerMinute: number };

export type MinuteCharge =
  | { charged: true; coinsCharged: number; billedMinutes: number; balance: number; minutesLeft: number }
  | { charged: false; balance: number };

function wholeNumber(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new BadRequestException(`${field} must be a whole number between ${min} and ${max}.`);
  }
  return number;
}

@Injectable()
export class DirectCallsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(PlatformSetting) private readonly settingRepo: Repository<PlatformSetting>,
    @InjectRepository(VideoCall) private readonly callRepo: Repository<VideoCall>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(MatchRelation) private readonly matchRepo: Repository<MatchRelation>,
  ) {}

  // --- Settings -------------------------------------------------------------

  async settings(): Promise<DirectCallSettings> {
    const row = await this.settingRepo.findOne({ where: { key: SETTINGS_KEY } });
    return { ...DEFAULT_DIRECT_CALL_SETTINGS, ...((row?.value as Partial<DirectCallSettings>) || {}) };
  }

  async updateSettings(input: Partial<DirectCallSettings>): Promise<DirectCallSettings> {
    const current = await this.settings();
    const next: DirectCallSettings = {
      enabled: input.enabled === undefined ? current.enabled : Boolean(input.enabled),
      videoRatePerMinute: wholeNumber(input.videoRatePerMinute ?? current.videoRatePerMinute, 1, 10000, 'Video rate'),
      audioRatePerMinute: wholeNumber(input.audioRatePerMinute ?? current.audioRatePerMinute, 1, 10000, 'Audio rate'),
      freeCallsPerMonth: wholeNumber(input.freeCallsPerMonth ?? current.freeCallsPerMonth, 0, 1000, 'Free calls per month'),
      freeVideoSeconds: wholeNumber(input.freeVideoSeconds ?? current.freeVideoSeconds, 5, 3600, 'Free video seconds'),
      freeAudioSeconds: wholeNumber(input.freeAudioSeconds ?? current.freeAudioSeconds, 5, 3600, 'Free audio seconds'),
      receiverPercent: wholeNumber(input.receiverPercent ?? current.receiverPercent, 0, 100, 'Receiver share'),
      agentPercent: wholeNumber(input.agentPercent ?? current.agentPercent, 0, 100, 'Agent share'),
      maxCallsPerReceiverPerDay: wholeNumber(input.maxCallsPerReceiverPerDay ?? current.maxCallsPerReceiverPerDay, 1, 1000, 'Calls per person per day'),
      packs: Array.isArray(input.packs)
        ? input.packs.map((coins) => wholeNumber(coins, 10, 100000, 'Pack coins'))
        : current.packs,
    };
    if (next.receiverPercent + next.agentPercent > 100) {
      throw new BadRequestException('Receiver and agent shares cannot exceed 100%.');
    }
    if (!next.packs.length || next.packs.length > 6) throw new BadRequestException('Offer between 1 and 6 coin packs.');
    await this.settingRepo.save(this.settingRepo.create({ key: SETTINGS_KEY, value: next }));
    return next;
  }

  rateFor(settings: DirectCallSettings, callType: VideoCallType) {
    return callType === 'video' ? settings.videoRatePerMinute : settings.audioRatePerMinute;
  }

  freeSecondsFor(settings: DirectCallSettings, callType: VideoCallType) {
    return callType === 'video' ? settings.freeVideoSeconds : settings.freeAudioSeconds;
  }

  // --- Per-user state -------------------------------------------------------

  /** Free direct calls this month: only answered calls count. */
  async freeCallsUsed(userId: string): Promise<number> {
    return this.callRepo.count({
      where: { callerId: userId, mode: 'direct', isFreeTrial: true, startedAt: Not(IsNull()), createdAt: MoreThanOrEqual(monthStart()) },
    });
  }

  async summary(userId: string) {
    const [settings, user, used] = await Promise.all([
      this.settings(),
      this.userRepo.findOne({ where: { id: userId }, select: { id: true, coinBalance: true, earnedCoinBalance: true, allowDirectCalls: true } }),
      this.freeCallsUsed(userId),
    ]);
    if (!user) throw new NotFoundException('User not found.');
    return {
      enabled: settings.enabled,
      videoRatePerMinute: settings.videoRatePerMinute,
      audioRatePerMinute: settings.audioRatePerMinute,
      freeCallsPerMonth: settings.freeCallsPerMonth,
      freeCallsRemaining: Math.max(0, settings.freeCallsPerMonth - used),
      freeVideoSeconds: settings.freeVideoSeconds,
      freeAudioSeconds: settings.freeAudioSeconds,
      packs: settings.packs,
      balance: user.coinBalance + user.earnedCoinBalance,
      allowDirectCalls: user.allowDirectCalls,
    };
  }

  async setAllowDirectCalls(userId: string, allow: boolean) {
    await this.userRepo.update(userId, { allowDirectCalls: Boolean(allow) });
    return { allowDirectCalls: Boolean(allow) };
  }

  // --- Starting a call ------------------------------------------------------

  /**
   * Validates a direct call and decides how it is paid for: from coins when the
   * caller can afford at least one minute, otherwise from the monthly free
   * allowance. Throws UPGRADE_REQUIRED when neither is available.
   */
  async planCall(callerId: string, receiverId: string, callType: VideoCallType): Promise<DirectCallPlan> {
    const settings = await this.settings();
    if (!settings.enabled) throw new ForbiddenException('Direct calls are currently unavailable.');
    if (!receiverId || receiverId === callerId) throw new BadRequestException('Choose another user to call.');

    const users = await this.userRepo.find({
      where: { id: In([callerId, receiverId]) },
      select: { id: true, status: true, role: true, coinBalance: true, earnedCoinBalance: true, allowDirectCalls: true },
    });
    const caller = users.find((user) => user.id === callerId);
    const receiver = users.find((user) => user.id === receiverId);
    if (!caller) throw new NotFoundException('User not found.');
    if (!receiver || receiver.status !== 'active' || receiver.role !== 'user') throw new NotFoundException('This user is not available for calls.');

    const relation = await this.matchRepo.findOne({
      where: [
        { senderId: callerId, receiverId },
        { senderId: receiverId, receiverId: callerId },
      ],
    });
    if (relation?.status === MatchStatus.BLOCKED) throw new ForbiddenException('You cannot call this user.');
    if (!receiver.allowDirectCalls && relation?.status !== MatchStatus.MATCHED) {
      throw new ForbiddenException('This user only accepts calls from their matches.');
    }

    const callsToday = await this.callRepo.count({
      where: { callerId, receiverId, mode: 'direct', createdAt: MoreThanOrEqual(dayStart()) },
    });
    if (callsToday >= settings.maxCallsPerReceiverPerDay) {
      throw new ForbiddenException('You have reached today\'s call limit for this user. Try again tomorrow.');
    }

    const ratePerMinute = this.rateFor(settings, callType);
    if (caller.coinBalance + caller.earnedCoinBalance >= ratePerMinute) return { isFreeTrial: false, ratePerMinute };
    if ((await this.freeCallsUsed(callerId)) < settings.freeCallsPerMonth) return { isFreeTrial: true, ratePerMinute };
    throw new ForbiddenException(UPGRADE_REQUIRED);
  }

  async createCall(callerId: string, receiverId: string, callType: VideoCallType, plan: DirectCallPlan): Promise<VideoCall> {
    return this.callRepo.save(this.callRepo.create({
      conversationId: null,
      callerId,
      receiverId,
      callType,
      mode: 'direct',
      isFreeTrial: plan.isFreeTrial,
      ratePerMinute: plan.ratePerMinute,
      status: 'ringing',
    }));
  }

  // --- Billing --------------------------------------------------------------

  /**
   * Charges the next started minute of an active paid direct call and splits
   * it between receiver, the receiver's agent and the platform. Returns
   * charged:false (and charges nothing) when the caller cannot afford it.
   */
  async chargeMinute(callId: string): Promise<MinuteCharge> {
    const settings = await this.settings();
    return this.dataSource.transaction(async (manager) => {
      const call = await manager.getRepository(VideoCall).findOne({ where: { id: callId }, lock: { mode: 'pessimistic_write' } });
      if (!call || call.mode !== 'direct' || call.isFreeTrial || call.status !== 'active') return { charged: false, balance: 0 };
      const rate = call.ratePerMinute ?? this.rateFor(settings, call.callType);

      const users = await manager.getRepository(User).find({
        where: { id: In([call.callerId, call.receiverId]) },
        lock: { mode: 'pessimistic_write' },
      });
      const caller = users.find((user) => user.id === call.callerId);
      const receiver = users.find((user) => user.id === call.receiverId);
      if (!caller || !receiver) return { charged: false, balance: 0 };
      const balance = caller.coinBalance + caller.earnedCoinBalance;
      if (balance < rate) return { charged: false, balance };

      const agent = receiver.createdByAgentId
        ? await manager.getRepository(Agent).findOne({ where: { id: receiver.createdByAgentId, status: 'active' }, lock: { mode: 'pessimistic_write' } })
        : null;
      // Without an agent, the agent's share goes to the receiver.
      const receiverCoins = Math.floor((rate * (settings.receiverPercent + (agent ? 0 : settings.agentPercent))) / 100);
      const agentCoins = agent ? Math.floor((rate * settings.agentPercent) / 100) : 0;
      const platformCoins = rate - receiverCoins - agentCoins;

      // Spend purchased coins first, then earned coins.
      const fromPurchased = Math.min(caller.coinBalance, rate);
      caller.coinBalance -= fromPurchased;
      caller.earnedCoinBalance -= rate - fromPurchased;
      receiver.earnedCoinBalance += receiverCoins;
      await manager.getRepository(User).save([caller, receiver]);
      if (agent) {
        agent.earnedCoinBalance += agentCoins;
        await manager.getRepository(Agent).save(agent);
      }

      call.billedMinutes += 1;
      call.coinsCharged += rate;
      await manager.getRepository(VideoCall).save(call);
      await manager.getRepository(CoinTransaction).save(manager.getRepository(CoinTransaction).create({
        type: 'call',
        status: 'completed',
        userId: caller.id,
        senderId: caller.id,
        receiverId: receiver.id,
        agentId: agent?.id ?? null,
        callId: call.id,
        grossCoins: rate,
        userCoins: receiverCoins,
        agentCoins,
        platformCoins,
        label: `${call.callType === 'video' ? 'Video' : 'Audio'} call minute ${call.billedMinutes}`,
        payoutAccount: null,
      }));

      const remaining = caller.coinBalance + caller.earnedCoinBalance;
      return { charged: true, coinsCharged: call.coinsCharged, billedMinutes: call.billedMinutes, balance: remaining, minutesLeft: Math.floor(remaining / rate) };
    });
  }

  /** Coins earned from direct calls this month and in total, for the super-admin page. */
  async adminStats() {
    const sums = (since: Date | null) => {
      const query = this.dataSource.getRepository(CoinTransaction).createQueryBuilder('tx')
        .select('COUNT(*)', 'minutes')
        .addSelect('COUNT(DISTINCT tx.callId)', 'paidCalls')
        .addSelect('COALESCE(SUM(tx.grossCoins), 0)', 'coins')
        .addSelect('COALESCE(SUM(tx.userCoins), 0)', 'receiverCoins')
        .addSelect('COALESCE(SUM(tx.agentCoins), 0)', 'agentCoins')
        .addSelect('COALESCE(SUM(tx.platformCoins), 0)', 'platformCoins')
        .where("tx.type = 'call'");
      if (since) query.andWhere('tx.createdAt >= :since', { since });
      return query.getRawOne().then((row) => Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, Number(value) || 0])));
    };
    const since = monthStart();
    const [month, allTime, callsThisMonth, freeCallsThisMonth] = await Promise.all([
      sums(since),
      sums(null),
      this.callRepo.count({ where: { mode: 'direct', startedAt: Not(IsNull()), createdAt: MoreThanOrEqual(since) } }),
      this.callRepo.count({ where: { mode: 'direct', isFreeTrial: true, startedAt: Not(IsNull()), createdAt: MoreThanOrEqual(since) } }),
    ]);
    return { month: { ...month, answeredCalls: callsThisMonth, freeCalls: freeCallsThisMonth }, allTime };
  }

  async setEndReason(callId: string, reason: string) {
    await this.callRepo.update(callId, { endReason: reason.slice(0, 30) });
  }
}
