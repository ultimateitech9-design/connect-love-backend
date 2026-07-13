import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileBoost } from './boost.entity';
import { BoostsController } from './boosts.controller';
import { BoostsService } from './boosts.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileBoost])],
  controllers: [BoostsController],
  providers: [BoostsService],
  exports: [BoostsService],
})
export class BoostsModule {}
