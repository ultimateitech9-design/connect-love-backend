import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { PlanUsage } from './plan-usage.entity';
import { PlanUsageService } from './plan-usage.service';

@Global()
@Module({ imports: [TypeOrmModule.forFeature([User, PlanUsage])], providers: [PlanUsageService], exports: [PlanUsageService] })
export class PlansModule {}
