import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FirstImpressionsService } from './first-impressions.service';

@UseGuards(AuthGuard('jwt'))
@Controller('first-impressions')
export class FirstImpressionsController {
  constructor(private readonly service: FirstImpressionsService) {}

  @Post()
  send(@Request() req: any, @Body('receiverId') receiverId: string, @Body('content') content: string) {
    return this.service.send(req.user.userId, receiverId, content);
  }

  @Get('received')
  received(@Request() req: any) {
    return this.service.received(req.user.userId);
  }

  @Post(':id/reply')
  reply(@Request() req: any, @Param('id') id: string, @Body('content') content: string) {
    return this.service.reply(req.user.userId, id, content);
  }
}
