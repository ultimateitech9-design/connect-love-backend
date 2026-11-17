import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Agent } from '../agents/agent.entity';
import { CoinTransaction } from '../users/coin-transaction.entity';
import { MatchRelation } from '../matches/match.entity';
import { PlatformSetting } from '../platform/platform-setting.entity';
import { VideoCall } from '../messages/video-call.entity';
import { Contact } from '../support/contact.entity';
import { DirectCallsController } from './direct-calls.controller';
import { DirectCallsService } from './direct-calls.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Agent, CoinTransaction, MatchRelation, PlatformSetting, VideoCall, Contact])],
  controllers: [DirectCallsController],
  providers: [DirectCallsService],
  exports: [DirectCallsService],
})
export class DirectCallsModule {}
