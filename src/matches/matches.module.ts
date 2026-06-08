import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchRelation } from './match.entity';
import { Message } from '../messages/message.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MatchRelation, Message, User])],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
