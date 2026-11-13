import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AgentGuard } from './agent.guard';
import { AgentBulkUsersDto, AgentEmailDto, AgentLoginDto, AgentPhotoDto, AgentRegisterDto, AgentResetDto, AgentUsersQueryDto } from './agents.dto';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly service: AgentsService) {}
  @Post('auth/signup-otp') requestSignup(@Body() body: AgentEmailDto, @Req() req: any) { this.service.throttle(`email:${req.ip}`, 15); return this.service.sendCode(body.email, 'signup'); }
  @Post('auth/register') register(@Body() body: AgentRegisterDto, @Req() req: any) { this.service.throttle(`verify:${req.ip}`, 20); return this.service.register(body); }
  @Post('auth/login') @HttpCode(200) login(@Body() body: AgentLoginDto, @Req() req: any) { this.service.throttle(`login:${req.ip}:${body.email}`, 10); return this.service.login(body); }
  @Post('auth/forgot-password') requestReset(@Body() body: AgentEmailDto, @Req() req: any) { this.service.throttle(`email:${req.ip}`, 15); return this.service.sendCode(body.email, 'reset'); }
  @Post('auth/reset-password') reset(@Body() body: AgentResetDto, @Req() req: any) { this.service.throttle(`verify:${req.ip}`, 20); return this.service.reset(body); }
  @Get('me') @UseGuards(AgentGuard) me(@Req() req: any) { return { agent: this.service.publicAgent(req.agent) }; }
  @Post('auth/logout') @UseGuards(AgentGuard) logout(@Req() req: any) { return this.service.logout(req.agent.id); }
  @Get('users') @UseGuards(AgentGuard) users(@Req() req: any, @Query() query: AgentUsersQueryDto) { return this.service.listUsers(req.agent.id, query); }
  @Get('users/:id') @UseGuards(AgentGuard) user(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.userDetails(req.agent.id, id); }
  @Get('users/:id/activity') @UseGuards(AgentGuard) activity(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query('page') page?: string) { return this.service.userActivity(req.agent.id, id, Number(page || 1)); }
  @Post('users/:id/ban') @UseGuards(AgentGuard) ban(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.moderateUser(req.agent.id, id, 'ban'); }
  @Post('users/:id/delete') @UseGuards(AgentGuard) delete(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.moderateUser(req.agent.id, id, 'delete'); }
  @Post('users/:id/photo') @UseGuards(AgentGuard) updatePhoto(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: AgentPhotoDto) { this.service.throttle(`photo:${req.agent.id}`, 30); return this.service.updatePhoto(req.agent.id, id, body.photo); }
  @Post('users/bulk') @UseGuards(AgentGuard) createUsers(@Req() req: any, @Body() body: AgentBulkUsersDto) { this.service.throttle(`create:${req.agent.id}`, 15); return this.service.createUsers(req.agent.id, body); }
}
