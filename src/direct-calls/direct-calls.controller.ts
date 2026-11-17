import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { DirectCallSettings, DirectCallsService } from './direct-calls.service';

@UseGuards(AuthGuard('jwt'))
@Controller('direct-calls')
export class DirectCallsController {
  constructor(private readonly directCalls: DirectCallsService) {}

  /** Rates, coin packs, free calls left this month and the caller's balance. */
  @Get('summary')
  summary(@Request() req: any) {
    return this.directCalls.summary(req.user.userId);
  }

  /** "Only my matches can call me" privacy setting. */
  @Patch('preferences')
  preferences(@Request() req: any, @Body('allowDirectCalls') allowDirectCalls: boolean) {
    return this.directCalls.setAllowDirectCalls(req.user.userId, allowDirectCalls);
  }

  /** Block someone from the call screen (works without a match). */
  @Post('block')
  block(@Request() req: any, @Body('userId') userId: string) {
    return this.directCalls.blockUser(req.user.userId, userId);
  }

  /** Report someone from the call screen; goes to super-admin complaints. */
  @Post('report')
  report(@Request() req: any, @Body() body: { callId: string; reason: string; details?: string }) {
    return this.directCalls.reportCall(req.user.userId, body.callId, body.reason, body.details || '');
  }

  @Get('admin/settings')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  adminSettings() {
    return this.directCalls.settings();
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  adminStats() {
    return this.directCalls.adminStats();
  }

  @Patch('admin/settings')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  updateAdminSettings(@Body() body: Partial<DirectCallSettings>) {
    return this.directCalls.updateSettings(body);
  }
}
