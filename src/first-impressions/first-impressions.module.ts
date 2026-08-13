import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { FirstImpression } from './first-impression.entity';
import { FirstImpressionsController } from './first-impressions.controller';
import { FirstImpressionsService } from './first-impressions.service';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { MatchRelation } from '../matches/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FirstImpression, User, MatchRelation]), PushNotificationsModule],
  controllers: [FirstImpressionsController],
  providers: [FirstImpressionsService],
})
export class FirstImpressionsModule {}
