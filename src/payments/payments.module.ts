import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../platform/payment.entity';
import { User } from '../users/user.entity';
import { Coupon } from './coupon.entity';
import { CouponsController } from './coupons.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ProfileBoost } from '../boosts/boost.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User, Coupon, ProfileBoost])],
  controllers: [PaymentsController, CouponsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
