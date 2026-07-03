import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { MatchRelation } from '../matches/match.entity';

interface DiscoveryFilters {
  search?: string;
  ageMin?: number;
  ageMax?: number;
}

const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 90;

function clampAge(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value!), DEFAULT_MIN_AGE), DEFAULT_MAX_AGE) : fallback;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
  ) {}

  async getSuggestions(currentUserId: string, filters: DiscoveryFilters = {}): Promise<User[]> {
    const currentUser = await this.userRepo.findOne({ where: { id: currentUserId } });
    const ageMin = clampAge(filters.ageMin, DEFAULT_MIN_AGE);
    const ageMax = Math.max(ageMin, clampAge(filters.ageMax, DEFAULT_MAX_AGE));
    const maxBirthDate = toDateOnly(yearsAgo(ageMin));
    const minBirthDate = yearsAgo(ageMax + 1);
    minBirthDate.setDate(minBirthDate.getDate() + 1);

    // We want to find all users that are NOT the current user
    const query = this.userRepo.createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId })
      // Only show active and verified users
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.role = :role', { role: 'user' })
      .andWhere('user.birthDate IS NOT NULL')
      .andWhere('user.birthDate BETWEEN :minBirthDate AND :maxBirthDate', {
        minBirthDate: toDateOnly(minBirthDate),
        maxBirthDate,
      });

    if (filters.search && filters.search.trim()) {
      query.andWhere('LOWER(user.name) LIKE :search', { search: `%${filters.search.toLowerCase().trim()}%` });
    } else {
      // Default: exclude users already swiped/matched
      query.andWhere((qb) => {
        const subQuery = qb.subQuery()
          .select('match.id')
          .from(MatchRelation, 'match')
          .where('(match.senderId = :currentUserId AND match.receiverId = user.id)')
          .orWhere('(match.receiverId = :currentUserId AND match.senderId = user.id)')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      });
    }

    if (currentUser?.onlyShowVerifiedProfiles && !(filters.search && filters.search.trim())) {
      query.andWhere('user.isVerified = :verified', { verified: true });
    }

    const users = await query.orderBy('user.createdAt', 'DESC').limit(50).getMany();

    return users.map(user => {
      const { password, ...rest } = user;
      return {
        ...rest,
        age: user.age, // Serialize the virtual getter
        avatarUrl: user.avatarUrl,
        photo: user.avatarUrl,
        photos: user.photos || [],
        photosVisibleToNonMatches: true,
        verified: user.isVerified,
        personality: user.personalityWords || [],
        hobbies: user.hobbies || [],
        interests: user.interests || [],
        distanceMi: null,
        goals: null,
      } as any;
    });
  }

  async getPopularTags(): Promise<{ interests: string[] }> {
    const users = await this.userRepo.find({ select: ['interests'] });
    const interestCounts: Record<string, number> = {};
    
    users.forEach(u => {
      if (Array.isArray(u.interests)) {
        u.interests.forEach(i => {
          interestCounts[i] = (interestCounts[i] || 0) + 1;
        });
      }
    });

    const sortedInterests = Object.entries(interestCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    return { interests: sortedInterests.slice(0, 50) };
  }
}
