import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CallHistoryFilter, VideoCallsService } from './video-calls.service';

const HISTORY_FILTERS: CallHistoryFilter[] = ['all', 'missed', 'incoming', 'outgoing'];

@UseGuards(AuthGuard('jwt'))
@Controller('video-calls')
export class VideoCallsController {
  constructor(private readonly videoCallsService: VideoCallsService) {}

  /** GET /video-calls/history?filter=all|missed|incoming|outgoing&before=<ISO date> */
  @Get('history')
  history(@Request() req, @Query('filter') filter?: string, @Query('before') before?: string) {
    const safeFilter = HISTORY_FILTERS.includes(filter as CallHistoryFilter) ? (filter as CallHistoryFilter) : 'all';
    return this.videoCallsService.history(req.user.userId, safeFilter, before);
  }

  /** Missed calls not seen yet: drives the Calls dot and the bell. */
  @Get('missed')
  missed(@Request() req) {
    return this.videoCallsService.unseenMissed(req.user.userId);
  }

  @Post('missed/seen')
  missedSeen(@Request() req) {
    return this.videoCallsService.markMissedSeen(req.user.userId);
  }

  @Get('incoming')
  incomingCall(@Request() req) {
    return this.videoCallsService.findIncoming(req.user.userId);
  }

  @Post()
  startCall(
    @Request() req,
    @Body('conversationId') conversationId: string,
    @Body('receiverId') receiverId: string,
    @Body('callType') callType?: 'audio' | 'video',
  ) {
    return this.videoCallsService.start(conversationId, req.user.userId, receiverId, callType);
  }

  @Patch(':id/accept')
  acceptCall(@Request() req, @Param('id') id: string) {
    return this.videoCallsService.accept(id, req.user.userId);
  }

  @Patch(':id/end')
  endCall(@Request() req, @Param('id') id: string) {
    return this.videoCallsService.finish(id, req.user.userId, 'ended');
  }

  @Patch(':id/reject')
  rejectCall(@Request() req, @Param('id') id: string) {
    return this.videoCallsService.finish(id, req.user.userId, 'rejected');
  }
}
