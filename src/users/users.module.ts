import { Module } from '@nestjs/common';
import { PayoutsModule } from '../payouts/payouts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { MatchRelation } from '../matches/match.entity';
import { ProfileView } from './profile-view.entity';
import { CoinTransaction } from './coin-transaction.entity';
import { RolesGuard } from '../auth/roles.guard';
import { WalletPaymentsService } from './wallet-payments.service';
import { WalletPaymentsController } from './wallet-payments.controller';
import { UserEmail } from './user-email.entity';
import { UserEmailChallenge } from './user-email-challenge.entity';
import { EmailManagementService } from './email-management.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, MatchRelation, ProfileView, CoinTransaction, UserEmail, UserEmailChallenge]), PayoutsModule],
  controllers: [UsersController, WalletPaymentsController],
  providers: [UsersService, WalletPaymentsService, EmailManagementService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
