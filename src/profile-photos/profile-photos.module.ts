import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { ProfilePhotosController } from './profile-photos.controller';
import { ProfilePhotosService } from './profile-photos.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [ProfilePhotosController],
  providers: [ProfilePhotosService],
})
export class ProfilePhotosModule {}
