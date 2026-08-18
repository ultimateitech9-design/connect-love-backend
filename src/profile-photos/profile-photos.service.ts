import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { entitlementsFor } from '../plans/plan-entitlements';

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
    if (uniquePhotos.length === 0) {
      throw new BadRequestException('Keep at least one profile photo.');
    }
    const maxPhotos = entitlementsFor(user).profilePhotos;
    if (uniquePhotos.length > maxPhotos) {
      throw new BadRequestException(`Your plan allows a maximum of ${maxPhotos} profile photos. Upgrade to add more.`);
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
