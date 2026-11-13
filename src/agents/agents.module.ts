import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/user.entity';
import { Agent, AgentEmailChallenge } from './agent.entity';
import { AgentGuard } from './agent.guard';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { UserActivityService } from '../users/user-activity.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, AgentEmailChallenge, User]), AuthModule, MessagesModule],
  controllers: [AgentsController], providers: [AgentsService, AgentGuard, UserActivityService],
})
export class AgentsModule {}
