import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ReferralsService } from './referrals.service';
import { PayoutsService } from '../payouts/payouts.service';
import { REFERRAL_MIN_WITHDRAWAL_PAISE } from './referral-policy';

class ReferralWithdrawalDto {
  @IsUUID() requestId: string;
  @IsInt() @Min(REFERRAL_MIN_WITHDRAWAL_PAISE) @Max(100000000) amountPaise: number;
  @IsOptional() @IsUUID() accountId?: string;
}

@Controller('referrals')
@UseGuards(AuthGuard('jwt'))
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService, private readonly payouts: PayoutsService) {}
  @Get('me') summary(@Req() req: any) { return this.referrals.summary(req.user.userId); }
  @Get('accounts') accounts(@Req() req: any, @Query('page') page?: string) { return this.referrals.accounts(req.user.userId, Number(page || 0)); }
  @Post('welcome/dismiss') dismiss(@Req() req: any) { return this.referrals.dismissWelcome(req.user.userId); }
  @Post('withdrawals') withdraw(@Req() req: any, @Body() dto: ReferralWithdrawalDto) {
    return this.payouts.requestReferralWithdrawal(req.user.userId, dto);
  }
}
