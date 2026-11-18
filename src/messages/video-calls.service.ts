import { ForbiddenException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { VideoCall, VideoCallStatus, VideoCallType } from './video-call.entity';
import { PlanUsageService } from '../plans/plan-usage.service';
import { User } from '../users/user.entity';
import { monthStartIndia, PLAN_CALL_SECONDS } from '../plans/plan-entitlements';

/** Thrown by start() when the caller's plan calls for this month are used up. */
export const PLAN_CALLS_USED = 'PLAN_CALLS_USED';

export type CallParticipant = { id: string; name: string; photo: string | null };
export type CallHistoryFilter = 'all' | 'missed' | 'incoming' | 'outgoing';

@Injectable()
export class VideoCallsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(VideoCall)
    private readonly callRepo: Repository<VideoCall>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
    private readonly planUsage: PlanUsageService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * After a restart no socket or billing timer survives, so calls still marked
   * ringing/active are dead: close them so they stop showing as in progress
   * (and paid direct calls are not left open).
   */
  async onApplicationBootstrap() {
    try {
      const ended = await this.callRepo.createQueryBuilder().update(VideoCall)
        .set({ status: 'ended', endedAt: () => 'CURRENT_TIMESTAMP', endReason: 'server_restart' })
        .where("status = 'active'").execute();
      const missed = await this.callRepo.createQueryBuilder().update(VideoCall)
        .set({ status: 'missed', endedAt: () => 'CURRENT_TIMESTAMP' })
        .where("status = 'ringing'").execute();
      if (ended.affected || missed.affected) {
        new Logger(VideoCallsService.name).log(`Closed ${ended.affected ?? 0} active and ${missed.affected ?? 0} ringing calls left by a restart.`);
      }
    } catch (error) {
      new Logger(VideoCallsService.name).warn(`Could not close stale calls: ${String(error)}`);
    }
  }

  /** Name and first photo, so a call can be shown on any page without the chat list. */
  async participant(userId: string): Promise<CallParticipant | null> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: { id: true, name: true, photos: true } });
    if (!user) return null;
    return { id: user.id, name: user.name, photo: user.photos?.[0] ?? null };
  }

  private async assertMatchedConversation(conversationId: string, userId: string): Promise<MatchRelation> {
    const match = await this.matchRepo.findOne({ where: { id: conversationId } });
    if (!match) throw new NotFoundException('Conversation not found.');
    if (match.senderId !== userId && match.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this conversation.');
    }
    if (match.status !== MatchStatus.MATCHED) {
      throw new ForbiddenException('Video calls are available only after both users match.');
    }
    return match;
  }

  async start(conversationId: string, callerId: string, receiverId: string, callType: VideoCallType = 'video'): Promise<VideoCall> {
    const match = await this.assertMatchedConversation(conversationId, callerId);
    const validReceiver = receiverId === match.senderId || receiverId === match.receiverId;
    if (!validReceiver || receiverId === callerId) {
      throw new ForbiddenException('Invalid receiver for this call.');
    }

    // Plan calls: a monthly number per type, each cut after a few seconds
    // (isFreeTrial marks a time-limited call). Only answered calls count.
    const { limits } = await this.planUsage.get(callerId);
    const allowance = callType === 'video' ? limits.videoCallsPerMonth : limits.audioCallsPerMonth;
    if (limits.limitedCalls) {
      const used = await this.callRepo.count({
        where: { callerId, mode: 'match', callType, isFreeTrial: true, startedAt: Not(IsNull()), createdAt: MoreThanOrEqual(monthStartIndia()) },
      });
      if (used >= allowance) throw new ForbiddenException(PLAN_CALLS_USED);
    }

    return this.callRepo.save(this.callRepo.create({
      conversationId,
      callerId,
      receiverId,
      callType,
      isFreeTrial: limits.limitedCalls,
      status: 'ringing',
    }));
  }

  /**
   * Call history for one user, newest first, paged by createdAt.
   * outcome is from this user's point of view: a call nobody answered is
   * 'missed' for the receiver and 'no_answer' for the caller.
   */
  async history(userId: string, filter: CallHistoryFilter = 'all', before?: string, limit = 30) {
    const ringingCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const query = this.callRepo.createQueryBuilder('call')
      .where('(call.callerId = :userId OR call.receiverId = :userId)', { userId })
      .orderBy('call.createdAt', 'DESC')
      .take(limit + 1);
    if (filter === 'outgoing') query.andWhere('call.callerId = :userId', { userId });
    if (filter === 'incoming') query.andWhere('call.receiverId = :userId', { userId });
    if (filter === 'missed') {
      query.andWhere('call.receiverId = :userId', { userId })
        .andWhere('call.startedAt IS NULL')
        .andWhere("call.status <> 'rejected'")
        .andWhere("(call.status <> 'ringing' OR call.createdAt < :ringingCutoff)", { ringingCutoff });
    }
    const beforeDate = before ? new Date(before) : null;
    if (beforeDate && !Number.isNaN(beforeDate.getTime())) query.andWhere('call.createdAt < :before', { before: beforeDate });

    const rows = await query.getMany();
    const page = rows.slice(0, limit);
    const otherIds = [...new Set(page.map((call) => (call.callerId === userId ? call.receiverId : call.callerId)))];
    const others = otherIds.length
      ? await this.userRepo.find({ where: { id: In(otherIds) }, select: { id: true, name: true, photos: true } })
      : [];
    const byId = new Map(others.map((user) => [user.id, { id: user.id, name: user.name, photo: user.photos?.[0] ?? null }]));

    const items = page.map((call) => {
      const direction = call.callerId === userId ? 'outgoing' : 'incoming';
      const stillRinging = call.status === 'ringing' && call.createdAt >= ringingCutoff;
      const outcome = call.startedAt
        ? (call.status === 'active' ? 'ongoing' : 'answered')
        : call.status === 'rejected'
          ? 'declined'
          : stillRinging
            ? 'ringing'
            : direction === 'incoming' ? 'missed' : 'no_answer';
      const durationSeconds = call.startedAt && call.endedAt
        ? Math.max(0, Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000))
        : null;
      return {
        id: call.id,
        callType: call.callType,
        mode: call.mode,
        direction,
        outcome,
        createdAt: call.createdAt,
        durationSeconds,
        conversationId: call.conversationId,
        isFreeTrial: call.isFreeTrial,
        // Only the caller pays; never show a receiver what the caller spent.
        coinsCharged: direction === 'outgoing' ? call.coinsCharged : null,
        endReason: call.endReason,
        otherUser: byId.get(direction === 'outgoing' ? call.receiverId : call.callerId) ?? null,
      };
    });
    return {
      items,
      nextCursor: rows.length > limit ? page[page.length - 1].createdAt.toISOString() : null,
    };
  }

  /** Answered or ringing calls involving the user (the gateway checks who is online). */
  busyCandidates(userId: string, ringSeconds: number): Promise<VideoCall[]> {
    const ringingSince = new Date(Date.now() - ringSeconds * 1000);
    const activeSince = new Date(Date.now() - 6 * 3600 * 1000);
    return this.callRepo.createQueryBuilder('call')
      .where('(call.callerId = :userId OR call.receiverId = :userId)', { userId })
      .andWhere(
        "((call.status = 'active' AND call.startedAt > :activeSince) OR (call.status = 'ringing' AND call.ringsReceiver = 1 AND call.createdAt > :ringingSince))",
        { activeSince, ringingSince },
      )
      .getMany();
  }

  /** Calls still ringing for a user who was offline when they started. */
  pendingRingsFor(userId: string, ringSeconds: number): Promise<VideoCall[]> {
    return this.callRepo.find({
      where: { receiverId: userId, status: 'ringing', ringsReceiver: false, createdAt: MoreThan(new Date(Date.now() - ringSeconds * 1000)) },
    });
  }

  async markRinging(callId: string) {
    await this.callRepo.update(callId, { ringsReceiver: true });
  }

  /** People the user has called or been called by recently (for online dots on the Calls page). */
  async recentCallPartnerIds(userId: string): Promise<string[]> {
    const rows = await this.callRepo.createQueryBuilder('call')
      .select(['call.callerId', 'call.receiverId'])
      .where('(call.callerId = :userId OR call.receiverId = :userId)', { userId })
      .orderBy('call.createdAt', 'DESC')
      .take(200)
      .getMany();
    return [...new Set(rows.map((call) => (call.callerId === userId ? call.receiverId : call.callerId)))];
  }

  /** Marks a call that must not ring: the receiver was offline when it started. */
  async markReceiverOffline(callId: string) {
    await this.callRepo.update(callId, { ringsReceiver: false });
  }

  /** Missed calls since the user last opened the Calls page (at most the last 7 days). */
  async unseenMissed(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: { id: true, callsSeenAt: true } });
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const since = user?.callsSeenAt && user.callsSeenAt > weekAgo ? user.callsSeenAt : weekAgo;
    const ringingCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const calls = await this.callRepo.createQueryBuilder('call')
      .where('call.receiverId = :userId', { userId })
      .andWhere('call.startedAt IS NULL')
      .andWhere("call.status <> 'rejected'")
      .andWhere("(call.status <> 'ringing' OR call.createdAt < :ringingCutoff)", { ringingCutoff })
      .andWhere('call.createdAt > :since', { since })
      .orderBy('call.createdAt', 'DESC')
      .take(20)
      .getMany();
    const callerIds = [...new Set(calls.map((call) => call.callerId))];
    const callers = callerIds.length ? await this.userRepo.find({ where: { id: In(callerIds) }, select: { id: true, name: true } }) : [];
    const names = new Map(callers.map((caller) => [caller.id, caller.name]));
    return {
      count: calls.length,
      items: calls.map((call) => ({ id: call.id, callType: call.callType, createdAt: call.createdAt, caller: { id: call.callerId, name: names.get(call.callerId) ?? 'Someone' } })),
    };
  }

  async markMissedSeen(userId: string) {
    await this.userRepo.update(userId, { callsSeenAt: new Date() });
    return { ok: true };
  }

  findById(id: string): Promise<VideoCall | null> {
    return this.callRepo.findOne({ where: { id } });
  }

  async findIncoming(userId: string): Promise<(VideoCall & { callerProfile: CallParticipant | null }) | null> {
    const recentThreshold = new Date(Date.now() - 2 * 60 * 1000);
    const call = await this.callRepo.findOne({
      where: { receiverId: userId, status: 'ringing', ringsReceiver: true, createdAt: MoreThan(recentThreshold) },
      order: { createdAt: 'DESC' },
    });
    if (!call) return null;
    return { ...call, callerProfile: await this.participant(call.callerId) };
  }

  async accept(callId: string, userId: string): Promise<VideoCall> {
    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found.');
    if (call.receiverId !== userId) throw new ForbiddenException('Only the receiver can accept this call.');
    if (call.status !== 'ringing') throw new ForbiddenException('This call has already ended.');
    call.status = 'active';
    call.startedAt = new Date();
    return this.callRepo.save(call);
  }

  /** Seconds a plan call to a match may last; null when unlimited. */
  planCallSeconds(call: VideoCall): number | null {
    return call.mode === 'match' && call.isFreeTrial ? PLAN_CALL_SECONDS[call.callType] : null;
  }

  async finish(callId: string, userId: string, status: VideoCallStatus = 'ended'): Promise<VideoCall> {
    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found.');
    if (call.callerId !== userId && call.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this call.');
    }
    call.status = status;
    call.endedAt = new Date();
    return this.callRepo.save(call);
  }
}
