import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VideoCallsService } from './video-calls.service';

@UseGuards(AuthGuard('jwt'))
@Controller('video-calls')
export class VideoCallsController {
  constructor(private readonly videoCallsService: VideoCallsService) {}

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
