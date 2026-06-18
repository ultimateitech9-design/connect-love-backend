import { Injectable, NotFoundException } from '@nestjs/common';
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
      photosVisibleToNonMatches: true,
      isVerified: user.isVerified,
    };
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: string, data: UpdateProfileDto): Promise<any> {
    const sanitizedData = { ...data };
    if (sanitizedData.interests) {
      sanitizedData.interests = normalizeTags(sanitizedData.interests);
    }
    if (sanitizedData.personalityWords) {
      sanitizedData.personalityWords = normalizeTags(sanitizedData.personalityWords);
    }
    if (sanitizedData.hobbies) {
      sanitizedData.hobbies = normalizeTags(sanitizedData.hobbies);
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

  async updatePresence(userId: string, isOnline: boolean): Promise<void> {
    const updateData: Partial<User> = { isOnline };
    if (!isOnline) {
      updateData.lastSeen = new Date();
    }
    await this.userRepo.update(userId, updateData);
  }
}
