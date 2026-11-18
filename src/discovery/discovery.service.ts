import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { entitlementsFor } from '../plans/plan-entitlements';
import { MatchRelation } from '../matches/match.entity';
import { SearchService } from '../search/search.service';
import { distanceBetweenKm } from '../location/distance';
import { FirstImpression } from '../first-impressions/first-impression.entity';

interface DiscoveryFilters {
  compact?: boolean;
  nameSearch?: boolean;
  interests?: string[];
  verifiedOnly?: boolean;
  cursor?: string;
  queue?: boolean;
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

  async getSuggestions(currentUserId: string, filters: DiscoveryFilters = {}): Promise<any> {
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
        'user.planExpiresAt',
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

    if (filters.compact) {
      // Search rows should not transfer full base64 photos or card biographies.
      query.select(['user.id', 'user.name', 'user.gender', 'user.birthDate', 'user.profession', 'user.city', 'user.plan', 'user.planExpiresAt', 'user.isVerified', 'user.photosVisibleToNonMatches', 'user.showDistance', 'user.locationLatitude', 'user.locationLongitude', 'user.createdAt'])
        .addSelect('COALESCE(JSON_LENGTH(user.photos), 0)', 'profilePhotoCount');
    }
    const excludedQueueIds = [...new Set((filters.excludeIds || []).filter((id) => id && id !== currentUserId))].slice(0, 24);
    if (excludedQueueIds.length > 0) {
      query.andWhere('user.id NOT IN (:...excludedQueueIds)', { excludedQueueIds });
    }

    // An intentional name lookup can find previously actioned profiles.
    // Recommendation queues still exclude profiles already actioned.
    if (!filters.nameSearch) query.andWhere((qb) => {
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
    const genderGroups = filters.nameSearch && requestedGender === 'everyone'
      ? [Object.values(GENDER_ALIASES).flat()]
      : requestedGender !== 'everyone' && DISCOVERABLE_GENDERS.has(requestedGender)
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
        .where('((relationship.senderId = :currentUserId AND relationship.receiverId = user.id) OR (relationship.receiverId = :currentUserId AND relationship.senderId = user.id))')
        .andWhere(filters.nameSearch ? "relationship.status = 'BLOCKED'" : '1 = 1')
        .getQuery();
      return 'NOT EXISTS ' + relationship;
    });
    if (filters.nameSearch) {
      for (const column of ['status', 'id'] as const) {
        query.addSelect(qb => qb.select('existing.' + column).from(MatchRelation, 'existing')
          .where('((existing.senderId = :currentUserId AND existing.receiverId = user.id) OR (existing.receiverId = :currentUserId AND existing.senderId = user.id))')
          .orderBy('existing.updatedAt', 'DESC').limit(1), column === 'status' ? 'searchRelationshipStatus' : 'searchRelationshipId');
      }
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim().replace(/\s+/g, ' ').slice(0, 120);
      const searchIds = filters.queue || filters.nameSearch ? null : await this.searchService.searchUserIds(term, { ageMin, ageMax, limit, offset });
      if (filters.nameSearch) {
        const name = "LOWER(TRIM(REGEXP_REPLACE(user.name, '[[:space:]]+', ' ')))";
        const escaped = term.toLowerCase().replace(/[!%_]/g, value => '!' + value);
        query.andWhere(name + " LIKE :nameContains ESCAPE '!'", { nameContains: '%' + escaped + '%' })
          .addSelect('CASE WHEN ' + name + ' = :nameExact THEN 0 WHEN ' + name + " LIKE :namePrefix ESCAPE '!' THEN 1 ELSE 2 END", 'nameMatchScore')
          .setParameters({ nameExact: term.toLowerCase(), namePrefix: escaped + '%' })
          .orderBy('nameMatchScore', 'ASC').addOrderBy('user.createdAt', 'DESC');
      } else {
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
    }

    if (filters.interests?.length) {
      const parts = filters.interests.map((interest, index) => {
        query.setParameter('interest' + index, JSON.stringify(interest));
        return 'JSON_CONTAINS(user.interests, :interest' + index + ')';
      });
      query.andWhere('(' + parts.join(' OR ') + ')');
    }
    if (filters.verifiedOnly || (currentUser?.onlyShowVerifiedProfiles && !(filters.search && filters.search.trim()))) {
      // Verified = passed the photo/ID (KYC) check.
      query.andWhere('(user.isVerified = :verified OR user.kycMatched = :verified)', { verified: true });
    }
    // "Looking for" is a real filter: only people with one of the chosen goals.
    const goalFilter = (filters.goals ?? []).map((goal) => String(goal).trim()).filter(Boolean).slice(0, 10);
    if (goalFilter.length) {
      query.andWhere('user.relationshipGoal IN (:...goalFilter)', { goalFilter });
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
    if (filters.queue) {
      // Preserve preference/distance ranking and add a unique tie breaker.
      query.skip(0).addOrderBy('user.id', 'DESC');
      if (filters.cursor) {
        let cursor: { values: (string | number)[] };
        const ordering = Object.entries(query.expressionMap.orderBys);
        try {
          cursor = JSON.parse(Buffer.from(filters.cursor, 'base64url').toString());
          if (!Array.isArray(cursor.values) || cursor.values.length !== ordering.length ||
            cursor.values.some(value => typeof value !== 'string' && typeof value !== 'number')) throw new Error();
        } catch { throw new BadRequestException('Invalid discovery cursor.'); }
        // MySQL HAVING supports the computed ranking aliases.
        const parameters: Record<string, string | number | Date> = {};
        const clauses = ordering.map(([column, direction], index) => {
          parameters['cursor' + index] = column === 'user.createdAt' ? new Date(cursor.values[index]) : cursor.values[index];
          const equals = ordering.slice(0, index).map(([previous], preceding) => previous + ' = :cursor' + preceding);
          return '(' + [...equals, column + (direction === 'ASC' ? ' > ' : ' < ') + ':cursor' + index].join(' AND ') + ')';
        });
        query.having('(' + clauses.join(' OR ') + ')', parameters);
      }
    }
    // MySQL can carry the full JSON document through filesort even when only
    // JSON_LENGTH is selected. Sort only IDs and numeric ranking expressions.
    const orderKeys = new Set(Object.keys(query.expressionMap.orderBys));
    const rank = query.clone().select(['user.id', 'user.createdAt']);
    query.expressionMap.selects.filter(select => select.aliasName && orderKeys.has(select.aliasName))
      .forEach(select => rank.addSelect(select.selection, select.aliasName));
    const rankedResult = await rank.take(filters.queue ? limit + 1 : limit).getRawAndEntities();
    const hasMore = filters.queue && rankedResult.entities.length > limit;
    const pageUsers = filters.queue ? rankedResult.entities.slice(0, limit) : rankedResult.entities;
    let users: User[] = [];
    if (pageUsers.length) {
      // Hydrate only this page via primary keys, without ORDER BY or filesort.
      const hydrate = this.userRepo.createQueryBuilder('user')
        .select(query.expressionMap.selects.filter(select => select.selection.startsWith('user.')).map(select => select.selection))
        .where('user.id IN (:...pageIds)', { pageIds: pageUsers.map(user => user.id) })
        .addSelect('COALESCE(JSON_LENGTH(user.photos), 0)', 'profilePhotoCount')
        .setParameters(query.getParameters());
      if (!filters.compact) hydrate.addSelect("JSON_UNQUOTE(JSON_EXTRACT(user.photos, '$[0]'))", 'primaryPhoto');
      query.expressionMap.selects.filter(select => select.aliasName?.startsWith('searchRelationship'))
        .forEach(select => hydrate.addSelect(select.selection, select.aliasName));
      const hydrated = await hydrate.getRawAndEntities();
      hydrated.raw.forEach((row, index) => Object.assign(hydrated.entities[index], {
        __primaryPhoto: row.primaryPhoto || null,
        __photoCount: Number(row.profilePhotoCount) || 0,
        __relationshipStatus: row.searchRelationshipStatus || null,
        __relationshipId: row.searchRelationshipId || null,
      }));
      const byId = new Map(hydrated.entities.map(user => [user.id, user]));
      users = pageUsers.map(user => byId.get(user.id)).filter((user): user is User => Boolean(user));
    }
    const last = users[users.length - 1];
    const lastRaw = last ? rankedResult.raw.find(row => row.user_id === last.id) : undefined;
    const items = users.map(user => {
      const primaryPhoto = (user as any).__primaryPhoto ?? user.avatarUrl;
      const visiblePhotos = primaryPhoto ? [primaryPhoto] : [];
      return {
        id: user.id,
        hasPhoto: ((user as any).__photoCount || 0) > 0,
        ...(filters.nameSearch ? { relationshipStatus: (user as any).__relationshipStatus, relationshipId: (user as any).__relationshipId } : {}),
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
        planExpiresAt: user.planExpiresAt,
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
    const values = last ? Object.keys(query.expressionMap.orderBys).map(column => column === 'user.createdAt' ? last.createdAt.toISOString() : column === 'user.id' ? last.id : Number(lastRaw[column])) : [];
    return filters.queue ? { items, hasMore, nextCursor: hasMore && last ? Buffer.from(JSON.stringify({ values })).toString('base64url') : null } : items;
  }

  async searchThumbnail(viewerId: string, userId: string) {
    // Recheck status and blocks even when the search list came from a cache.
    const row = await this.userRepo.createQueryBuilder('user')
      .select("JSON_UNQUOTE(JSON_EXTRACT(user.photos, '$[0]'))", 'photo')
      .addSelect('user.photosVisibleToNonMatches', 'visible')
      .where('user.id = :userId AND user.status = :status AND user.role = :role', { userId, status: 'active', role: 'user' })
      .andWhere("NOT EXISTS (SELECT 1 FROM matches blocked WHERE ((blocked.senderId = :viewerId AND blocked.receiverId = user.id) OR (blocked.receiverId = :viewerId AND blocked.senderId = user.id)) AND blocked.status = 'BLOCKED')", { viewerId })
      .getRawOne();
    if (!row) throw new NotFoundException('Profile is unavailable.');
    if (!row.visible) {
      const matched = await this.userRepo.manager.getRepository(MatchRelation).createQueryBuilder('relation')
        .where("((relation.senderId = :viewerId AND relation.receiverId = :userId) OR (relation.receiverId = :viewerId AND relation.senderId = :userId)) AND relation.status = 'MATCHED'", { viewerId, userId }).getExists();
      if (!matched) return { photo: null };
    }
    const source = String(row.photo || '');
    if (/^https?:\/\//i.test(source) || /^\/[^/]/.test(source)) return { photo: source };
    const match = source.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return { photo: null };
    try {
      const thumbnail = await sharp(Buffer.from(match[1], 'base64'), { limitInputPixels: 40_000_000 })
        .rotate().resize(112, 112, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 65 }).toBuffer();
      return { photo: 'data:image/webp;base64,' + thumbnail.toString('base64') };
    } catch { return { photo: null }; }
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
