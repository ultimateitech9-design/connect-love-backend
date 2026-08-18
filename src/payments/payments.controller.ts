import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@Controller('payments/razorpay')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order')
  @UseGuards(AuthGuard('jwt'))
  createOrder(@Req() request: any, @Body('plan') plan: string, @Body('couponCode') couponCode?: string) {
    return this.paymentsService.createOrder(request.user.userId, plan, couponCode);
  }

  @Post('boost/order')
  @UseGuards(AuthGuard('jwt'))
  createBoostOrder(@Req() request: any, @Body('planKey') planKey: string) {
    return this.paymentsService.createBoostOrder(request.user.userId, planKey);
  }
  @Post('coupon/validate')
  @UseGuards(AuthGuard('jwt'))
  validateCoupon(@Req() request: any, @Body('plan') plan: string, @Body('couponCode') couponCode: string) {
    return this.paymentsService.validateCoupon(request.user.userId, plan, couponCode);
  }

  @Post('verify')
  @UseGuards(AuthGuard('jwt'))
  verifyPayment(
    @Req() request: any,
    @Body() body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string },
  ) {
    return this.paymentsService.verifyPayment(request.user.userId, body);
  }

  @Post('webhook')
  webhook(@Req() request: any, @Headers('x-razorpay-signature') signature?: string) {
    return this.paymentsService.handleWebhook(request.rawBody, request.body, signature);
  }
}
