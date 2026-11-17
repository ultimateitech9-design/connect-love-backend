import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { VideoCall, VideoCallStatus, VideoCallType } from './video-call.entity';
import { PlanUsageService } from '../plans/plan-usage.service';
import { User } from '../users/user.entity';

export type CallParticipant = { id: string; name: string; photo: string | null };
export type CallHistoryFilter = 'all' | 'missed' | 'incoming' | 'outgoing';

@Injectable()
export class VideoCallsService {
  constructor(
    @InjectRepository(VideoCall)
    private readonly callRepo: Repository<VideoCall>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
    private readonly planUsage: PlanUsageService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

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
    if (callType === 'video') await this.planUsage.assertAndRecord(callerId, 'videoCallsPerDay', 'Video call', receiverId, true);

    return this.callRepo.save(this.callRepo.create({
      conversationId,
      callerId,
      receiverId,
      callType,
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

  findById(id: string): Promise<VideoCall | null> {
    return this.callRepo.findOne({ where: { id } });
  }

  async findIncoming(userId: string): Promise<(VideoCall & { callerProfile: CallParticipant | null }) | null> {
    const recentThreshold = new Date(Date.now() - 2 * 60 * 1000);
    const call = await this.callRepo.findOne({
      where: { receiverId: userId, status: 'ringing', createdAt: MoreThan(recentThreshold) },
      order: { createdAt: 'DESC' },
    });
    if (!call) return null;
    return { ...call, callerProfile: await this.participant(call.callerId) };
  }

  async accept(callId: string, userId: string): Promise<VideoCall> {
    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found.');
    if (call.receiverId !== userId) throw new ForbiddenException('Only the receiver can accept this call.');
    call.status = 'active';
    call.startedAt = new Date();
    return this.callRepo.save(call);
  }

  async durationMinutesForCaller(callerId: string): Promise<number> {
    const { limits } = await this.planUsage.get(callerId);
    return limits.maxVideoCallMinutes;
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
