import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
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
}
