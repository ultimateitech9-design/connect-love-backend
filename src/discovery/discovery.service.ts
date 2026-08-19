import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { entitlementsFor } from '../plans/plan-entitlements';
import { MatchRelation } from '../matches/match.entity';
import { SearchService } from '../search/search.service';
import { distanceBetweenKm } from '../location/distance';
import { FirstImpression } from '../first-impressions/first-impression.entity';

interface DiscoveryFilters {
  interestedIn?: string;
  search?: string;
  ageMin?: number;
  ageMax?: number;
  goals?: string[];
  maxDistance?: number;
  page?: number;
  limit?: number;
  excludeIds?: string[];
}

const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 90;
const DISCOVERABLE_GENDERS = new Set(['female', 'male', 'non-binary', 'prefer-not']);
const GENDER_ALIASES: Record<string, string[]> = {
  female: ['female', 'woman', 'women', 'girl', 'ladies', 'f'],
  male: ['male', 'man', 'men', 'boy', 'm'],
  'non-binary': ['non-binary', 'nonbinary', 'non binary', 'nb'],
  'prefer-not': ['prefer-not', 'prefer not', 'prefer not to say'],
};

function canonicalGender(value: string | null | undefined): string {
  const gender = String(value || '').trim().toLowerCase();
  return Object.entries(GENDER_ALIASES).find(([, aliases]) => aliases.includes(gender))?.[0] || gender;
}

function defaultGenderGroups(gender: string): string[][] {
  if (gender === 'male') return [GENDER_ALIASES.female, GENDER_ALIASES.male, GENDER_ALIASES['non-binary']];
  if (gender === 'female') return [GENDER_ALIASES.male, GENDER_ALIASES.female, GENDER_ALIASES['non-binary']];
  if (gender === 'non-binary') return [GENDER_ALIASES.female, GENDER_ALIASES.male, GENDER_ALIASES['non-binary']];
  return [[...GENDER_ALIASES.female, ...GENDER_ALIASES.male, ...GENDER_ALIASES['non-binary']]];
}

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
    private readonly searchService: SearchService,
  ) {}

  async getSuggestions(currentUserId: string, filters: DiscoveryFilters = {}): Promise<User[]> {
    // Do not hydrate the current user's complete base64 photo gallery before
    // discovery can start. Only ranking/privacy fields are needed here.
    const currentUser = await this.userRepo.findOne({
      where: { id: currentUserId },
      select: [
        'id',
        'gender',
        'city',
        'religion',
        'onlyShowVerifiedProfiles',
        'locationLatitude',
        'locationLongitude',
      ],
    });
    const ageMin = clampAge(filters.ageMin, DEFAULT_MIN_AGE);
    const ageMax = Math.max(ageMin, clampAge(filters.ageMax, DEFAULT_MAX_AGE));
    const page = Math.max(1, Math.trunc(filters.page || 1));
    // Keep discovery responses small enough for profiles with base64 photos.
    // Subsequent batches are fetched as the current batch is swiped away.
    const limit = Math.min(24, Math.max(1, Math.trunc(filters.limit || 12)));
    const offset = (page - 1) * limit;
    const maxBirthDate = toDateOnly(yearsAgo(ageMin));
    const minBirthDate = yearsAgo(ageMax + 1);
    minBirthDate.setDate(minBirthDate.getDate() + 1);

    // We want to find all users that are NOT the current user
    const query = this.userRepo.createQueryBuilder('user')
      // Discovery cards only need the primary photo. Avoid loading every user's
      // complete base64 photo gallery before the first card can render.
      .select([
        'user.id',
        'user.name',
        'user.gender',
        'user.birthDate',
        'user.profession',
        'user.religion',
        'user.height',
        'user.city',
        'user.bio',
        'user.relationshipGoal',
        'user.zodiac',
        'user.plan',
        'user.isVerified',
        'user.kycMatched',
        'user.isOnline',
        'user.lastSeen',
        'user.photosVisibleToNonMatches',
        'user.showOnlineStatus',
        'user.showDistance',
        'user.locationLatitude',
        'user.locationLongitude',
        'user.personalityWords',
        'user.hobbies',
        'user.interests',
        'user.createdAt',
      ])
      .addSelect("JSON_UNQUOTE(JSON_EXTRACT(user.photos, '$[0]'))", 'primaryPhoto')
      .addSelect('COALESCE(JSON_LENGTH(user.photos), 0)', 'profilePhotoCount')
      .where('user.id != :currentUserId', { currentUserId })
      // Only show active and verified users
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.role = :role', { role: 'user' })
      .andWhere('user.birthDate IS NOT NULL')
      .andWhere('user.birthDate BETWEEN :minBirthDate AND :maxBirthDate', {
        minBirthDate: toDateOnly(minBirthDate),
        maxBirthDate,
      });

    const excludedQueueIds = [...new Set((filters.excludeIds || []).filter((id) => id && id !== currentUserId))].slice(0, 24);
    if (excludedQueueIds.length > 0) {
      query.andWhere('user.id NOT IN (:...excludedQueueIds)', { excludedQueueIds });
    }

    // A First Impression is a like. Once sent, that profile must never be
    // offered to the sender again, including search and recycled-pass results.
    query.andWhere((qb) => {
      const sentImpression = qb.subQuery()
        .select('sentImpression.id')
        .from(FirstImpression, 'sentImpression')
        .where('sentImpression.senderId = :currentUserId')
        .andWhere('sentImpression.receiverId = user.id')
        .getQuery();
      return 'NOT EXISTS ' + sentImpression;
    });

    const currentGender = canonicalGender(currentUser?.gender);
    const rawRequestedGender = String(filters.interestedIn || 'everyone').trim().toLowerCase();
    const requestedGender = rawRequestedGender === 'everyone' ? 'everyone' : canonicalGender(rawRequestedGender);
    const genderGroups = requestedGender !== 'everyone' && DISCOVERABLE_GENDERS.has(requestedGender)
      ? [GENDER_ALIASES[requestedGender] || [requestedGender]]
      : defaultGenderGroups(currentGender);
    const visibleGenders = [...new Set(genderGroups.flat())];
    const genderRankParts = genderGroups.map((_, index) =>
      'WHEN LOWER(TRIM(user.gender)) IN (:...genderRank' + index + ') THEN ' + index,
    );
    query
      .andWhere('LOWER(TRIM(user.gender)) IN (:...visibleGenders)', { visibleGenders })
      .addSelect('CASE ' + genderRankParts.join(' ') + ' ELSE ' + genderGroups.length + ' END', 'genderPreferenceScore');
    genderGroups.forEach((group, index) => query.setParameter('genderRank' + index, group));

    query.andWhere((qb) => {
      const relationship = qb.subQuery()
        .select('relationship.id')
        .from(MatchRelation, 'relationship')
        .where('(relationship.senderId = :currentUserId AND relationship.receiverId = user.id)')
        .orWhere('(relationship.receiverId = :currentUserId AND relationship.senderId = user.id)')
        .getQuery();
      return 'NOT EXISTS ' + relationship;
    });

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      const searchIds = await this.searchService.searchUserIds(term, { ageMin, ageMax, limit, offset });
      if (searchIds) {
        if (searchIds.length === 0) return [];
        query.andWhere('user.id IN (:...searchIds)', { searchIds });
        const rankSql = searchIds.map((_, index) => `WHEN :rank${index} THEN ${index}`).join(' ');
        searchIds.forEach((id, index) => query.setParameter(`rank${index}`, id));
        query
          .orderBy('genderPreferenceScore', 'ASC')
          .addOrderBy(`CASE user.id ${rankSql} ELSE ${searchIds.length} END`, 'ASC');
      } else {
        query.andWhere('(LOWER(user.name) LIKE :search OR LOWER(user.city) LIKE :search OR LOWER(user.profession) LIKE :search)', {
          search: `%${term.toLowerCase()}%`,
        }).skip(offset);
      }
    }

    if (currentUser?.onlyShowVerifiedProfiles && !(filters.search && filters.search.trim())) {
      query.andWhere('user.isVerified = :verified', { verified: true });
    }

    const requestedDistance = Number.isFinite(filters.maxDistance)
      ? Math.max(1, Math.min(10000, filters.maxDistance!))
      : 10000;
    const currentLatitude = currentUser?.locationLatitude ?? null;
    const currentLongitude = currentUser?.locationLongitude ?? null;
    const distanceSql = `6371.0088 * ACOS(LEAST(1, GREATEST(-1,
      COS(RADIANS(:currentLatitude)) * COS(RADIANS(user.locationLatitude))
      * COS(RADIANS(user.locationLongitude) - RADIANS(:currentLongitude))
      + SIN(RADIANS(:currentLatitude)) * SIN(RADIANS(user.locationLatitude))
    )))`;
    query.setParameters({ currentLatitude, currentLongitude });

    if (requestedDistance < 10000 && currentLatitude !== null && currentLongitude !== null) {
      query
        .andWhere('user.locationLatitude IS NOT NULL')
        .andWhere('user.locationLongitude IS NOT NULL')
        .andWhere(`${distanceSql} <= :maxDistance`, { maxDistance: requestedDistance });
    }

    if (!(filters.search && filters.search.trim())) {
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
          ELSE ${distanceSql} END`, 'distanceScore')
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
        .orderBy('genderPreferenceScore', 'ASC')
        .addOrderBy('relationshipGoalScore', 'ASC')
        .addOrderBy('locationMissingScore', 'ASC')
        .addOrderBy('distanceScore', 'ASC')
        .addOrderBy('boostScore', 'DESC')
        .addOrderBy('cityScore', 'DESC')
        .addOrderBy('religionScore', 'DESC')
        .addOrderBy('user.createdAt', 'DESC')
        .skip(offset);
    }
    const rankedResult = await query.take(limit).getRawAndEntities();
    let users = rankedResult.entities;
    rankedResult.raw.forEach((row, index) => {
      (users[index] as any).__primaryPhoto = row.primaryPhoto || null;
      (users[index] as any).__photoCount = Number(row.profilePhotoCount) || 0;
    });

    return users.map(user => {
      const primaryPhoto = (user as any).__primaryPhoto ?? user.avatarUrl;
      const visiblePhotos = primaryPhoto ? [primaryPhoto] : [];
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
        planBadge: entitlementsFor(user).verifiedBadge,
        kycMatched: user.kycMatched,
        isOnline: user.showOnlineStatus ? user.isOnline : false,
        lastSeen: user.showOnlineStatus ? user.lastSeen : null,
        avatarUrl: primaryPhoto,
        photo: primaryPhoto,
        photos: visiblePhotos,
        photoCount: (user as any).__photoCount ?? user.photos?.length ?? 0,
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
