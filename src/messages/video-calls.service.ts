import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { VideoCall, VideoCallStatus } from './video-call.entity';

@Injectable()
export class VideoCallsService {
  constructor(
    @InjectRepository(VideoCall)
    private readonly callRepo: Repository<VideoCall>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
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

  async start(conversationId: string, callerId: string, receiverId: string): Promise<VideoCall> {
    const match = await this.assertMatchedConversation(conversationId, callerId);
    const validReceiver = receiverId === match.senderId || receiverId === match.receiverId;
    if (!validReceiver || receiverId === callerId) {
      throw new ForbiddenException('Invalid receiver for this call.');
    }

    return this.callRepo.save(this.callRepo.create({
      conversationId,
      callerId,
      receiverId,
      status: 'ringing',
    }));
  }

  async accept(callId: string, userId: string): Promise<VideoCall> {
    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found.');
    if (call.receiverId !== userId) throw new ForbiddenException('Only the receiver can accept this call.');
    call.status = 'active';
    call.startedAt = new Date();
    return this.callRepo.save(call);
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
