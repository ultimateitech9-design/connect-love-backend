import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@Controller('payments/razorpay')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order')
  @UseGuards(AuthGuard('jwt'))
  createOrder(@Req() request: any, @Body('plan') plan: string) {
    return this.paymentsService.createOrder(request.user.userId, plan);
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
