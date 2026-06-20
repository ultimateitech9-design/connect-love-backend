import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class ProfilePhotosService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updatePhotos(userId: string, photos: string[]): Promise<{
    message: string;
    photos: string[];
    isVerified: boolean;
    kycMatched: boolean;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const uniquePhotos = [...new Set((photos || []).filter(Boolean))];
    if (uniquePhotos.length > 5) {
      throw new BadRequestException('Maximum 5 photos allowed');
    }

    const primaryPhotoChanged = user.photos?.[0] !== uniquePhotos[0];
    user.photos = uniquePhotos;
    if (primaryPhotoChanged) {
      user.kycLivePhoto = null;
      user.kycMatched = false;
      user.kycMatchScore = null;
      user.kycVerifiedAt = null;
      user.isVerified = false;
    }
    await this.userRepository.save(user);

    return {
      message: 'Photos updated successfully',
      photos: user.photos,
      isVerified: user.isVerified,
      kycMatched: user.kycMatched,
    };
  }
}
