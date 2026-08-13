import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletPaymentsService } from './wallet-payments.service';

@Controller('wallet/razorpay')
export class WalletPaymentsController {
  constructor(private readonly wallet: WalletPaymentsService) {}
  @Post('order') @UseGuards(AuthGuard('jwt')) order(@Req() req: any, @Body('coins') coins: number) { return this.wallet.createRechargeOrder(req.user.userId, Number(coins)); }
  @Post('verify') @UseGuards(AuthGuard('jwt')) verify(@Req() req: any, @Body() body: any) { return this.wallet.verifyRecharge(req.user.userId, body); }
  @Post('withdrawals') @UseGuards(AuthGuard('jwt')) withdraw(@Req() req: any, @Body() body: { coins?: number; upiId?: string }) { return this.wallet.requestWithdrawal(req.user.userId, Number(body.coins), String(body.upiId || '')); }
  @Post('webhook') webhook(@Req() req: any, @Headers('x-razorpay-signature') signature?: string) { return this.wallet.handleWebhook(req.rawBody, req.body, signature); }
}
