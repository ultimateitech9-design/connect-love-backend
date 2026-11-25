import { Controller, Delete, Get, Post, Patch, Param, Body, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchStatus } from './match.entity';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  async getMatches(@Query('filter') filter: 'active' | 'sent' | 'received' | 'blocked' | 'messages', @Query('limit') limit: string, @Query('offset') offset: string, @Query('compact') compact: string, @Request() req) {
    const userId = req.user.userId;
    return this.matchesService.findForFilter(userId, filter, Number(limit) || 12, Number(offset) || 0, compact === '1');
  }

  @Get('page')
  async getPage(@Request() req, @Query('filter') filter: 'active' | 'sent' | 'received' | 'blocked', @Query('page') page: string, @Query('pageSize') pageSize: string, @Query('kind') kind?: 'normal' | 'super') {
    return this.matchesService.dashboardPage(req.user.userId, filter || 'active', Number(page ?? 0), Number(pageSize ?? 20), kind);
  }

  @Get('summary')
  async getSummary(@Request() req) {
    return this.matchesService.getSummary(req.user.userId);
  }

  @Get('celebrations')
  celebrations(@Request() req) { return this.matchesService.celebrationSnapshot(req.user.userId); }

  @Get(':id/profile')
  getProfile(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.matchesService.profileForMatch(id, req.user.userId);
  }

  @Post('swipe')
  async swipeProfile(@Request() req, @Body('receiverId') receiverId: string, @Body('action') action: 'like' | 'pass' | 'superlike') {
    const userId = req.user.userId;
    return this.matchesService.swipe(userId, receiverId, action);
  }

  @Patch('unblock/:id')
  async unblockUser(@Request() req, @Param('id') id: string) {
    return this.matchesService.unblockMatch(id, req.user.userId);
  }

  @Delete('swipe/:receiverId')
  async undoSwipe(@Request() req, @Param('receiverId') receiverId: string) {
    return this.matchesService.undoSwipe(req.user.userId, receiverId);
  }

  @Delete('pending/:id')
  async deletePendingRequest(@Request() req, @Param('id') id: string) {
    return this.matchesService.deletePendingRequest(id, req.user.userId);
  }

  @Patch('block/:id')
  async blockUser(@Request() req, @Param('id') id: string) {
    return this.matchesService.blockMatch(id, req.user.userId);
  }

  @Post('respond')
  async respond(@Request() req, @Body('matchId') matchId: string, @Body('action') action: 'accept' | 'decline') {
    return this.matchesService.respond(matchId, action, req.user.userId);
  }
}
