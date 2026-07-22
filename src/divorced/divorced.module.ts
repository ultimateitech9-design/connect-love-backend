import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DivorcedController } from './divorced.controller';
import { DivorcedLead } from './divorced-lead.entity';
import { DivorcedService } from './divorced.service';

@Module({
  imports: [TypeOrmModule.forFeature([DivorcedLead])],
  controllers: [DivorcedController],
  providers: [DivorcedService],
})
export class DivorcedModule {}
