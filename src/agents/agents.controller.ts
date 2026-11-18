import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PayoutInput, PayoutsService, WithdrawalRequest } from '../payouts/payouts.service';
import { AgentGuard } from './agent.guard';
import { AgentBulkUsersDto, AgentEmailDto, AgentLoginDto, AgentPhotoDto, AgentRegisterDto, AgentResetDto, AgentUsersQueryDto } from './agents.dto';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly service: AgentsService, private readonly payouts: PayoutsService) {}
  @Post('auth/signup-otp') requestSignup(@Body() body: AgentEmailDto, @Req() req: any) { this.service.throttle(`email:${req.ip}`, 15); return this.service.sendCode(body.email, 'signup'); }
  @Post('auth/register') register(@Body() body: AgentRegisterDto, @Req() req: any) { this.service.throttle(`verify:${req.ip}`, 20); return this.service.register(body); }
  @Post('auth/login') @HttpCode(200) login(@Body() body: AgentLoginDto, @Req() req: any) { this.service.throttle(`login:${req.ip}:${body.email}`, 10); return this.service.login(body); }
  @Post('auth/forgot-password') requestReset(@Body() body: AgentEmailDto, @Req() req: any) { this.service.throttle(`email:${req.ip}`, 15); return this.service.sendCode(body.email, 'reset'); }
  @Post('auth/reset-password') reset(@Body() body: AgentResetDto, @Req() req: any) { this.service.throttle(`verify:${req.ip}`, 20); return this.service.reset(body); }
  @Get('me') @UseGuards(AgentGuard) me(@Req() req: any) { return { agent: this.service.publicAgent(req.agent) }; }
  @Post('auth/logout') @UseGuards(AgentGuard) logout(@Req() req: any) { return this.service.logout(req.agent.id); }
  @Get('earnings') @UseGuards(AgentGuard) earnings(@Req() req: any) { return this.service.earnings(req.agent.id); }
  @Get('payout-accounts') @UseGuards(AgentGuard) payoutAccounts(@Req() req: any) { return this.payouts.listAccounts('agent', req.agent.id); }
  @Post('payout-accounts') @UseGuards(AgentGuard) createPayoutAccount(@Req() req: any, @Body() body: PayoutInput) { return this.payouts.createAccount('agent', req.agent.id, body); }
  @Patch('payout-accounts/:id') @UseGuards(AgentGuard) updatePayoutAccount(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: PayoutInput) { return this.payouts.updateAccount('agent', req.agent.id, id, body); }
  @Delete('payout-accounts/:id') @UseGuards(AgentGuard) deletePayoutAccount(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.payouts.deleteAccount('agent', req.agent.id, id); }
  @Get('withdrawals') @UseGuards(AgentGuard) withdrawals(@Req() req: any) { return this.payouts.withdrawals('agent', req.agent.id); }
  @Post('withdrawals') @UseGuards(AgentGuard) withdraw(@Req() req: any, @Body() body: WithdrawalRequest) { this.service.throttle(`withdraw:${req.agent.id}`, 10); return this.payouts.requestWithdrawal('agent', req.agent.id, body); }
  @Get('users') @UseGuards(AgentGuard) users(@Req() req: any, @Query() query: AgentUsersQueryDto) { return this.service.listUsers(req.agent.id, query); }
  @Get('users/export') @UseGuards(AgentGuard) exportUsers(@Req() req: any, @Query('cursor') cursor?: string) { return this.service.exportUsers(req.agent.id, cursor); }
  @Get('users/:id') @UseGuards(AgentGuard) user(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.userDetails(req.agent.id, id); }
  @Get('users/:id/activity') @UseGuards(AgentGuard) activity(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query('page') page?: string) { return this.service.userActivity(req.agent.id, id, Number(page || 1)); }
  @Post('users/:id/ban') @UseGuards(AgentGuard) ban(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.moderateUser(req.agent.id, id, 'ban'); }
  @Post('users/:id/delete') @UseGuards(AgentGuard) delete(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.moderateUser(req.agent.id, id, 'delete'); }
  @Post('users/:id/photo') @UseGuards(AgentGuard) updatePhoto(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: AgentPhotoDto) { this.service.throttle(`photo:${req.agent.id}`, 30); return this.service.updatePhoto(req.agent.id, id, body.photo); }
  @Post('users/bulk') @UseGuards(AgentGuard) createUsers(@Req() req: any, @Body() body: AgentBulkUsersDto) { this.service.throttle(`create:${req.agent.id}`, 15); return this.service.createUsers(req.agent.id, body); }
}
