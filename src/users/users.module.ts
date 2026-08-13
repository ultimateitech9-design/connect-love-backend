import { Module } from '@nestjs/common';
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

@Module({
  imports: [TypeOrmModule.forFeature([User, MatchRelation, ProfileView, CoinTransaction])],
  controllers: [UsersController, WalletPaymentsController],
  providers: [UsersService, WalletPaymentsService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
