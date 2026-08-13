import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { PlanUsage } from './plan-usage.entity';
import { dayStart, entitlementsFor, monthStart, type PlanEntitlements } from './plan-entitlements';

@Injectable()
export class PlanUsageService {
  constructor(@InjectRepository(User) private users: Repository<User>, @InjectRepository(PlanUsage) private usage: Repository<PlanUsage>) {}

  async get(userId: string): Promise<{ user: User; limits: PlanEntitlements }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    return { user, limits: entitlementsFor(user) };
  }

  async assertAndRecord(userId: string, action: keyof Pick<PlanEntitlements, 'likesPerDay' | 'videoCallsPerMonth' | 'sharedImagesPerMonth' | 'superLikesPerMonth' | 'rewindsPerMonth' | 'firstImpressionsPerMonth' | 'boostsPerMonth'>, label: string, targetId?: string, period: boolean | 'week' = false, limitOverride?: number, minimumUsed = 0) {
    const start = period === true ? dayStart() : period === 'week' ? new Date(Date.now() - 7 * 86400000) : monthStart();
    return this.usage.manager.transaction(async (manager) => {
      // Serialise usage updates per user. Without this lock, rapid clicks could
      // read the same count and push a free account beyond its daily limit.
      const user = await manager.getRepository(User).createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();
      if (!user) throw new NotFoundException('User not found.');

      const limit = limitOverride ?? entitlementsFor(user)[action];
      const usageRepository = manager.getRepository(PlanUsage);
      const recorded = await usageRepository.count({ where: { userId, action, createdAt: MoreThanOrEqual(start) } });
      const used = Math.max(recorded, minimumUsed);
      if (used >= limit) throw new BadRequestException(`${label} limit reached. Upgrade your plan to continue.`);
      await usageRepository.save(usageRepository.create({ userId, action, targetId: targetId || null }));
      return { limit, remaining: limit - used - 1 };
    });
  }
}
