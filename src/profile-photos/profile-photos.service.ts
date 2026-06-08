import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class ProfilePhotosService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updatePhotos(userId: string, photos: string[]): Promise<{ message: string; photos: string[] }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.photos = photos;
    await this.userRepository.save(user);

    return {
      message: 'Photos updated successfully',
      photos: user.photos,
    };
  }
}
