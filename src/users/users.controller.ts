import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { EmailManagementService } from './email-management.service';
import { EmailDto, EmailOtpDto, OtpDto } from './dto/email-management.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly emailManagement: EmailManagementService) {}

  @UseGuards(AuthGuard('jwt')) @Get('me/emails') listEmails(@Request() req: any) { return this.emailManagement.list(req.user.userId); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/change/request-old-otp') requestOldEmailOtp(@Request() req: any) { return this.emailManagement.requestOldPrimary(req.user.userId); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/change/verify-old-otp') verifyOldEmailOtp(@Request() req: any, @Body() body: OtpDto) { return this.emailManagement.verifyOldPrimary(req.user.userId, body.otp); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/change/request-new-otp') requestNewEmailOtp(@Request() req: any, @Body() body: EmailDto) { return this.emailManagement.requestNewPrimary(req.user.userId, body.email); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/change/verify-new-otp') verifyNewEmailOtp(@Request() req: any, @Body() body: OtpDto) { return this.emailManagement.verifyNewPrimary(req.user.userId, body.otp); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/secondary/request-otp') requestSecondaryOtp(@Request() req: any, @Body() body: EmailDto) { return this.emailManagement.requestSecondary(req.user.userId, body.email); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/secondary/verify-otp') verifySecondaryOtp(@Request() req: any, @Body() body: OtpDto) { return this.emailManagement.verifySecondary(req.user.userId, body.otp); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/secondary/remove/request-otp') requestRemoveSecondaryOtp(@Request() req: any, @Body() body: EmailDto) { return this.emailManagement.requestRemoveSecondary(req.user.userId, body.email); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/secondary/remove') removeSecondary(@Request() req: any, @Body() body: EmailOtpDto) { return this.emailManagement.removeSecondary(req.user.userId, body.email, body.otp); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/secondary/make-primary') makePrimary(@Request() req: any, @Body() body: EmailDto) { return this.emailManagement.makePrimary(req.user.userId, body.email); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/recovery/request-otp') requestRecoveryOtp(@Request() req: any) { return this.emailManagement.requestRecovery(req.user.userId); }
  @UseGuards(AuthGuard('jwt')) @Post('me/emails/recovery/verify-otp') verifyRecoveryOtp(@Request() req: any, @Body() body: OtpDto) { return this.emailManagement.verifyRecovery(req.user.userId, body.otp); }

  /** GET /users/me — returns the currently authenticated user's profile */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  /** Persist the member's Clear All acknowledgement across sessions. */
  @UseGuards(AuthGuard('jwt'))
  @Post('me/notifications/clear-all')
  clearAllNotifications(@Request() req: any) {
    return this.usersService.clearAllNotifications(req.user.userId);
  }

  /** GET /users/me/insights — real profile activity for the signed-in user */
  @UseGuards(AuthGuard('jwt'))
  @Get('me/insights')
  getMyInsights(@Request() req: any) {
    return this.usersService.getProfileInsights(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/profile-visitors')
  profileVisitors(@Request() req: any, @Query('offset') offset?: string) {
    return this.usersService.profileVisitors(req.user.userId, Number(offset) || 0);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/profile-visitors/:id/details')
  profileVisitorDetails(@Request() req: any, @Param('id') id: string) {
    return this.usersService.profileVisitorDetails(req.user.userId, id);
  }

  /** PATCH /users/me — update the currently authenticated user's profile */
  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/coins/recharge')
  rechargeCoins(@Request() req: any, @Body('amount') amount: number) {
    return this.usersService.rechargeCoins(req.user.userId, amount);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/coins/spend')
  spendCoins(@Request() req: any, @Body('amount') amount: number) {
    return this.usersService.spendCoins(req.user.userId, amount);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/coins/gift')
  sendGift(@Request() req: any, @Body() body: { receiverId?: string; amount?: number; label?: string }) {
    return this.usersService.sendGift(req.user.userId, String(body.receiverId || ''), Number(body.amount), body.label);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/coins/withdraw')
  requestWithdrawal(@Request() req: any, @Body() body: { amount?: number; payoutAccount?: string }) {
    return this.usersService.requestWithdrawal(req.user.userId, Number(body.amount), String(body.payoutAccount || ''));
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin')
  @Get('admin/coin-transactions')
  getCoinTransactions() {
    return this.usersService.getCoinTransactions();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin')
  @Post('admin/coins/credit')
  creditGiftCoins(
    @Request() req: any,
    @Body() body: { userId?: string; amount?: number; note?: string },
  ) {
    return this.usersService.creditGiftCoins(
      String(body.userId || ''),
      Number(body.amount),
      String(body.note || ''),
      String(req.user.userId || ''),
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin')
  @Patch('admin/coin-transactions/:id/withdrawal')
  updateWithdrawalStatus(@Param('id') id: string, @Body('status') status: 'completed' | 'rejected') {
    return this.usersService.updateWithdrawalStatus(id, status);
  }

  /** GET /users/me/export - returns a portable copy of the authenticated user's data */
  @UseGuards(AuthGuard('jwt'))
  @Get('me/export')
  exportMe(@Request() req: any) {
    return this.usersService.exportMe(req.user.userId);
  }

  /** PATCH /users/me/deactivate - pauses the account and removes it from discovery */
  @UseGuards(AuthGuard('jwt'))
  @Patch('me/deactivate')
  deactivateMe(@Request() req: any) {
    return this.usersService.deactivateMe(req.user.userId);
  }

  /** DELETE /users/me — permanently delete the currently authenticated user's account and all associated data */
  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  async deleteMe(@Request() req: any) {
    return this.usersService.removeMe(req.user.userId);
  }

  /** POST /users/:id/view — records a real Discover profile impression. */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/view')
  recordProfileView(@Param('id') id: string, @Request() req: any) {
    return this.usersService.recordProfileView(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/detail-view')
  recordProfileDetailView(@Param('id') id: string, @Request() req: any) {
    return this.usersService.recordProfileView(id, req.user.userId, true);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/details')
  async getProfileDetails(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findProfileDetails(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateProfileDto) {
    return this.usersService.update(id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
