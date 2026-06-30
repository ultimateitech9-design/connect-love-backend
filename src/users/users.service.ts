import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

const normalizeTags = (tags: string[]) => {
  if (!tags || !Array.isArray(tags)) return tags;
  return [...new Set(tags
    .map(t => t.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase()))
    .filter(Boolean))];
};

const KYC_MATCH_THRESHOLD = 60;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  serializeUser(user: User): any {
    return {
      ...user,
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

  async findProfileDetails(id: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    return {
      id: user.id,
      name: user.name,
      age: user.age,
      birthDate: user.birthDate,
      gender: user.gender,
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
      sanitizedData.photos = uniquePhotos;
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
    if (sanitizedData.kycMatched) {
      if (!sanitizedData.kycLivePhoto && !existingUser.kycLivePhoto) {
        throw new BadRequestException('Video KYC frame is required.');
      }
      const kycMatchScore = sanitizedData.kycMatchScore ?? existingUser.kycMatchScore ?? 0;
      if (kycMatchScore < KYC_MATCH_THRESHOLD) {
        throw new BadRequestException(`Video KYC match score must be at least ${KYC_MATCH_THRESHOLD}%.`);
      }
      sanitizedData.kycVerifiedAt = existingUser.kycVerifiedAt || new Date();
      sanitizedData.isVerified = true;
    }

    if (sanitizedData.onboardingCompleted) {
      const photos = sanitizedData.photos ?? existingUser.photos ?? [];
      const kycMatched = sanitizedData.kycMatched ?? existingUser.kycMatched;

      if (!photos.length) {
        throw new BadRequestException('Add at least one profile photo before completing onboarding.');
      }
      if (!kycMatched) {
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
