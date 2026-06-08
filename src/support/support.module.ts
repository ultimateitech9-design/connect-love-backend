import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { Contact } from './contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact])],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
