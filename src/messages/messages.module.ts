import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MatchRelation } from '../matches/match.entity';
import { MessagesGateway } from './messages.gateway';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MatchRelation]),
    UsersModule,
    MatchesModule,
    AuthModule
  ],
  providers: [MessagesService, MessagesGateway],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
