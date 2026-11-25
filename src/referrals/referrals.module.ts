import { Module } from '@nestjs/common';
import { PayoutsModule } from '../payouts/payouts.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({ imports: [PayoutsModule], controllers: [ReferralsController], providers: [ReferralsService], exports: [ReferralsService] })
export class ReferralsModule {}
