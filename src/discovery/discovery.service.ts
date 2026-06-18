import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { MatchRelation } from '../matches/match.entity';

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
  ) {}

  async getSuggestions(currentUserId: string): Promise<User[]> {
    const currentUser = await this.userRepo.findOne({ where: { id: currentUserId } });
    // We want to find all users that are NOT the current user
    // AND do not have any existing MatchRelation with the current user (either as sender or receiver).
    const query = this.userRepo.createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId })
      .andWhere((qb) => {
        const subQuery = qb.subQuery()
          .select('match.id')
          .from(MatchRelation, 'match')
          .where('(match.senderId = :currentUserId AND match.receiverId = user.id)')
          .orWhere('(match.receiverId = :currentUserId AND match.senderId = user.id)')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      })
      // Only show active and verified users
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.role = :role', { role: 'user' });

    if (currentUser?.onlyShowVerifiedProfiles) {
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
