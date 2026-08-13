import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { VideoCall, VideoCallStatus, VideoCallType } from './video-call.entity';
import { PlanUsageService } from '../plans/plan-usage.service';

@Injectable()
export class VideoCallsService {
  constructor(
    @InjectRepository(VideoCall)
    private readonly callRepo: Repository<VideoCall>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
    private readonly planUsage: PlanUsageService,
  ) {}

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
    if (callType === 'video') await this.planUsage.assertAndRecord(callerId, 'videoCallsPerMonth', 'Video call', receiverId);

    return this.callRepo.save(this.callRepo.create({
      conversationId,
      callerId,
      receiverId,
      callType,
      status: 'ringing',
    }));
  }

  async findIncoming(userId: string): Promise<VideoCall | null> {
    const recentThreshold = new Date(Date.now() - 2 * 60 * 1000);
    return this.callRepo.findOne({
      where: { receiverId: userId, status: 'ringing', createdAt: MoreThan(recentThreshold) },
      order: { createdAt: 'DESC' },
    });
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
