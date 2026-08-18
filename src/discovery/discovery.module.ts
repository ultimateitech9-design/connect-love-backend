import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { User } from '../users/user.entity';
import { MatchRelation } from '../matches/match.entity';
import { SearchModule } from '../search/search.module';
import { FirstImpression } from '../first-impressions/first-impression.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MatchRelation, FirstImpression]), SearchModule],
  providers: [DiscoveryService],
  controllers: [DiscoveryController],
})
export class DiscoveryModule {}
