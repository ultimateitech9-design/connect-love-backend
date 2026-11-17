import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayoutInput, PayoutsService, WithdrawalRequest } from './payouts.service';

/** Withdrawals and saved payout accounts for members (agents use /agents/...). */
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('payout-accounts')
  list(@Request() req: any) {
    return this.payouts.listAccounts('user', req.user.userId);
  }

  @Post('payout-accounts')
  create(@Request() req: any, @Body() body: PayoutInput) {
    return this.payouts.createAccount('user', req.user.userId, body);
  }

  @Patch('payout-accounts/:id')
  update(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: PayoutInput) {
    return this.payouts.updateAccount('user', req.user.userId, id, body);
  }

  @Delete('payout-accounts/:id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payouts.deleteAccount('user', req.user.userId, id);
  }

  /** Wallet history: purchases, gifts, calls, withdrawals. */
  @Get('transactions')
  transactions(@Request() req: any) {
    return this.payouts.walletHistory(req.user.userId);
  }

  @Get('withdrawals')
  withdrawals(@Request() req: any) {
    return this.payouts.withdrawals('user', req.user.userId);
  }

  @Post('withdrawals')
  withdraw(@Request() req: any, @Body() body: WithdrawalRequest) {
    return this.payouts.requestWithdrawal('user', req.user.userId, body);
  }
}
