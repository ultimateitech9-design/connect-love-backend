import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Agent } from '../agents/agent.entity';
import { CoinTransaction } from '../users/coin-transaction.entity';
import { PayoutAccount } from './payout-account.entity';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [TypeOrmModule.forFeature([PayoutAccount, User, Agent, CoinTransaction])],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
