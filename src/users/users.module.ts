import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { MatchRelation } from '../matches/match.entity';
import { ProfileView } from './profile-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MatchRelation, ProfileView])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
