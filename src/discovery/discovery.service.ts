import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { MatchRelation } from '../matches/match.entity';
import { SearchService } from '../search/search.service';
import { distanceBetweenKm } from '../location/distance';

interface DiscoveryFilters {
  interestedIn?: string;
  search?: string;
  ageMin?: number;
  ageMax?: number;
  goals?: string[];
  page?: number;
  limit?: number;
}

const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 90;
const DISCOVERABLE_GENDERS = new Set(['female', 'male', 'non-binary']);

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
    private readonly searchService: SearchService,
  ) {}

  async getSuggestions(currentUserId: string, filters: DiscoveryFilters = {}): Promise<User[]> {
    const currentUser = await this.userRepo.findOne({ where: { id: currentUserId } });
    const ageMin = clampAge(filters.ageMin, DEFAULT_MIN_AGE);
    const ageMax = Math.max(ageMin, clampAge(filters.ageMax, DEFAULT_MAX_AGE));
    const page = Math.max(1, Math.trunc(filters.page || 1));
    const limit = Math.min(50, Math.max(1, Math.trunc(filters.limit || 20)));
    const offset = (page - 1) * limit;
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

    if (filters.interestedIn && filters.interestedIn !== 'everyone' && DISCOVERABLE_GENDERS.has(filters.interestedIn)) {
      query.andWhere('LOWER(user.gender) = :interestedIn', { interestedIn: filters.interestedIn });
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      const searchIds = await this.searchService.searchUserIds(term, { ageMin, ageMax, limit, offset });
      if (searchIds) {
        if (searchIds.length === 0) return [];
        query.andWhere('user.id IN (:...searchIds)', { searchIds });
        const rankSql = searchIds.map((_, index) => `WHEN :rank${index} THEN ${index}`).join(' ');
        searchIds.forEach((id, index) => query.setParameter(`rank${index}`, id));
        query.orderBy(`CASE user.id ${rankSql} ELSE ${searchIds.length} END`, 'ASC');
      } else {
        query.andWhere('(LOWER(user.name) LIKE :search OR LOWER(user.city) LIKE :search OR LOWER(user.profession) LIKE :search)', {
          search: `%${term.toLowerCase()}%`,
        }).skip(offset);
      }
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

    if (!(filters.search && filters.search.trim())) {
      const currentLatitude = currentUser?.locationLatitude ?? null;
      const currentLongitude = currentUser?.locationLongitude ?? null;
      query
        .addSelect(
          filters.goals?.length
            ? 'CASE WHEN user.relationshipGoal IN (:...preferredGoals) THEN 0 ELSE 1 END'
            : '0',
          'relationshipGoalScore',
        )
        .addSelect(`CASE WHEN :currentLatitude IS NULL OR :currentLongitude IS NULL
          OR user.locationLatitude IS NULL OR user.locationLongitude IS NULL
          OR user.showDistance = 0 THEN 1 ELSE 0 END`, 'locationMissingScore')
        .addSelect(`CASE WHEN :currentLatitude IS NULL OR :currentLongitude IS NULL
          OR user.locationLatitude IS NULL OR user.locationLongitude IS NULL
          OR user.showDistance = 0 THEN 999999
          ELSE 6371.0088 * ACOS(LEAST(1, GREATEST(-1,
            COS(RADIANS(:currentLatitude)) * COS(RADIANS(user.locationLatitude))
            * COS(RADIANS(user.locationLongitude) - RADIANS(:currentLongitude))
            + SIN(RADIANS(:currentLatitude)) * SIN(RADIANS(user.locationLatitude))
          ))) END`, 'distanceScore')
        .addSelect(`CASE WHEN EXISTS (
          SELECT 1 FROM profile_boosts boost
          WHERE boost.userId = user.id AND boost.startsAt <= CURRENT_TIMESTAMP AND boost.endsAt > CURRENT_TIMESTAMP
        ) THEN 1 ELSE 0 END`, 'boostScore')
        .addSelect('CASE WHEN user.city = :currentCity THEN 1 ELSE 0 END', 'cityScore')
        .addSelect('CASE WHEN user.religion = :currentReligion THEN 1 ELSE 0 END', 'religionScore')
        .setParameters({
          currentLatitude,
          currentLongitude,
          currentCity: currentUser?.city || '',
          currentReligion: currentUser?.religion || '',
          ...(filters.goals?.length ? { preferredGoals: filters.goals } : {}),
        })
        .orderBy('relationshipGoalScore', 'ASC')
        .addOrderBy('locationMissingScore', 'ASC')
        .addOrderBy('distanceScore', 'ASC')
        .addOrderBy('boostScore', 'DESC')
        .addOrderBy('cityScore', 'DESC')
        .addOrderBy('religionScore', 'DESC')
        .addOrderBy('user.createdAt', 'DESC')
        .skip(offset);
    }
    const users = await query.take(limit).getMany();

    return users.map(user => {
      const primaryPhoto = user.avatarUrl;
      const visiblePhotos = user.photosVisibleToNonMatches
        ? (user.photos || []).filter(Boolean)
        : (primaryPhoto ? [primaryPhoto] : []);
      return {
        id: user.id,
        name: user.name,
        gender: user.gender,
        birthDate: user.birthDate,
        age: user.age, // Serialize the virtual getter
        profession: user.profession,
        religion: user.religion,
        height: user.height,
        city: user.city,
        bio: user.bio,
        relationshipGoal: user.relationshipGoal,
        zodiac: user.zodiac,
        plan: user.plan,
        isVerified: user.isVerified,
        isOnline: user.showOnlineStatus ? user.isOnline : false,
        lastSeen: user.showOnlineStatus ? user.lastSeen : null,
        avatarUrl: primaryPhoto,
        photo: primaryPhoto,
        // Keep the discovery feed lightweight: the primary photo is enough for
        // the first paint. ProfileCard fetches the full photo set on demand.
        photos: visiblePhotos.slice(0, 1),
        photoCount: visiblePhotos.length,
        photosVisibleToNonMatches: user.photosVisibleToNonMatches,
        verified: user.isVerified,
        personality: user.personalityWords || [],
        hobbies: user.hobbies || [],
        interests: user.interests || [],
        distanceKm: user.showDistance && currentUser
          ? distanceBetweenKm(currentUser.locationLatitude, currentUser.locationLongitude, user.locationLatitude, user.locationLongitude)
          : null,
        showDistance: user.showDistance,
        goals: user.relationshipGoal,
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
