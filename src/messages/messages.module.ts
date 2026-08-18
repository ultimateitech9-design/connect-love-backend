import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MatchRelation } from '../matches/match.entity';
import { MessagesGateway } from './messages.gateway';
import { VideoCall } from './video-call.entity';
import { VideoCallsService } from './video-calls.service';
import { VideoCallsController } from './video-calls.controller';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/user.entity';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { FirstImpression } from '../first-impressions/first-impression.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MatchRelation, VideoCall, User, FirstImpression]),
    UsersModule,
    MatchesModule,
    AuthModule,
    PushNotificationsModule,
  ],
  providers: [MessagesService, VideoCallsService, MessagesGateway],
  controllers: [MessagesController, VideoCallsController],
  exports: [MessagesService, VideoCallsService],
})
export class MessagesModule {}
