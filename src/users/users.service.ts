import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { distanceBetweenKm } from '../location/distance';

const normalizeTags = (tags: string[]) => {
  if (!tags || !Array.isArray(tags)) return tags;
  return [...new Set(tags
    .map(t => t.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase()))
    .filter(Boolean))];
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  serializeUser(user: User): any {
    return {
      ...user,
      religion: user.religion,
      age: user.age,
      avatarUrl: user.avatarUrl,
      photos: user.photos || [],
      kycLivePhoto: user.kycLivePhoto,
      kycMatched: user.kycMatched,
      kycMatchScore: user.kycMatchScore,
      kycVerifiedAt: user.kycVerifiedAt,
      photosVisibleToNonMatches: true,
      interests: user.interests || [],
      personalityWords: user.personalityWords || [],
      personality: user.personalityWords || [],
      hobbies: user.hobbies || [],
    };
  }

  async findById(id: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    return this.serializeUser(user);
  }

  async findProfileDetails(id: string, viewerId: string): Promise<any> {
    const [user, viewer] = await Promise.all([
      this.userRepo.findOne({ where: { id } }),
      this.userRepo.findOne({ where: { id: viewerId }, select: ['id', 'locationLatitude', 'locationLongitude'] }),
    ]);
    if (!user) throw new NotFoundException('User not found.');
    const distanceKm = user.showDistance && viewer
      ? distanceBetweenKm(viewer.locationLatitude, viewer.locationLongitude, user.locationLatitude, user.locationLongitude)
      : null;

    return {
      id: user.id,
      name: user.name,
      age: user.age,
      birthDate: user.birthDate,
      gender: user.gender,
      religion: user.religion,
      profession: user.profession,
      height: user.height,
      city: user.city,
      bio: user.bio,
      interests: user.interests || [],
      personality: user.personalityWords || [],
      hobbies: user.hobbies || [],
      avatarUrl: user.avatarUrl,
      photos: user.photos || [],
      kycMatched: user.kycMatched,
      kycMatchScore: user.kycMatchScore,
      photosVisibleToNonMatches: true,
      isVerified: user.isVerified,
      showDistance: user.showDistance,
      distanceKm,
    };
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: string, data: UpdateProfileDto): Promise<any> {
    const existingUser = await this.userRepo.findOne({ where: { id } });
    if (!existingUser) throw new NotFoundException('User not found.');

    const sanitizedData: any = { ...data };
    if (sanitizedData.photos) {
      const uniquePhotos = [...new Set(sanitizedData.photos.filter(Boolean))];
      if (uniquePhotos.length > 5) {
        throw new BadRequestException('Maximum 5 photos allowed.');
      }
      const photosChanged = JSON.stringify(existingUser.photos || []) !== JSON.stringify(uniquePhotos);
      sanitizedData.photos = uniquePhotos;
      if (photosChanged) {
        // A verified face must never remain attached to a different photo set.
        sanitizedData.kycLivePhoto = null;
        sanitizedData.kycMatched = false;
        sanitizedData.kycMatchScore = null;
        sanitizedData.kycVerifiedAt = null;
        sanitizedData.isVerified = false;
        sanitizedData.onboardingCompleted = false;
      }
    }
    if (sanitizedData.interests) {
      sanitizedData.interests = normalizeTags(sanitizedData.interests);
    }
    if (sanitizedData.personalityWords) {
      sanitizedData.personalityWords = normalizeTags(sanitizedData.personalityWords);
    }
    if (sanitizedData.hobbies) {
      sanitizedData.hobbies = normalizeTags(sanitizedData.hobbies);
    }
    if (sanitizedData.onboardingCompleted) {
      const photos = sanitizedData.photos ?? existingUser.photos ?? [];

      if (!photos.length) {
        throw new BadRequestException('Add at least one profile photo before completing onboarding.');
      }
      if (!existingUser.kycMatched || (existingUser.kycMatchScore ?? 0) < 60) {
        throw new BadRequestException('Complete video KYC match before completing onboarding.');
      }
    }
    sanitizedData.photosVisibleToNonMatches = true;

    // Only update fields that are part of the DTO (safe update)
    await this.userRepo.update(id, sanitizedData as any);
    return this.findById(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    await this.userRepo.delete(id);
    return { message: `User ${user.name} deleted.` };
  }

  async removeMe(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    
    // TypeORM ON DELETE CASCADE will handle matches and messages automatically
    await this.userRepo.delete(id);

    return { message: `Your account and all associated data have been permanently deleted.` };
  }

  async exportMe(id: string): Promise<{ exportedAt: string; user: any }> {
    const user = await this.findById(id);
    return {
      exportedAt: new Date().toISOString(),
      user,
    };
  }

  async deactivateMe(id: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    await this.userRepo.update(id, {
      status: 'suspended',
      isOnline: false,
      lastSeen: new Date(),
    });
    return { message: 'Your account has been deactivated. Contact support when you want to reactivate it.' };
  }

  async updatePresence(userId: string, isOnline: boolean): Promise<void> {
    const updateData: Partial<User> = { isOnline };
    if (!isOnline) {
      updateData.lastSeen = new Date();
    }
    await this.userRepo.update(userId, updateData);
  }
}
