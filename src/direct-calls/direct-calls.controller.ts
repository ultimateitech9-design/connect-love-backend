import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
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

  @Get('admin/settings')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  adminSettings() {
    return this.directCalls.settings();
  }

  @Patch('admin/settings')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  updateAdminSettings(@Body() body: Partial<DirectCallSettings>) {
    return this.directCalls.updateSettings(body);
  }
}
