import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivateBoostDto } from './dto/activate-boost.dto';
import { BoostsService } from './boosts.service';

@Controller('boosts')
@UseGuards(AuthGuard('jwt'))
export class BoostsController {
  constructor(private readonly boosts: BoostsService) {}

  @Get('plans')
  plans() { return this.boosts.getPlans(); }

  @Get('status')
  status(@Request() req: any) { return this.boosts.getStatus(req.user.userId); }

  @Post('activate')
  activate(@Request() req: any, @Body() dto: ActivateBoostDto) {
    return this.boosts.activate(req.user.userId, dto.planKey, dto.requestId);
  }
}
