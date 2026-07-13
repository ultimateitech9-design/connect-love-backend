import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { ProfileBoost, type BoostPlanKey } from './boost.entity';
import { User } from '../users/user.entity';

export const BOOST_PLANS: Record<BoostPlanKey, { name: string; durationMinutes: number; price: number }> = {
  '30_minutes': { name: '30 Minutes Boost', durationMinutes: 30, price: 49 },
  '1_hour': { name: '1 Hour Boost', durationMinutes: 60, price: 99 },
  '3_hours': { name: '3 Hours Boost', durationMinutes: 180, price: 199 },
  '24_hours': { name: '24 Hours Boost', durationMinutes: 1440, price: 499 },
};

@Injectable()
export class BoostsService {
  constructor(@InjectRepository(ProfileBoost) private readonly boosts: Repository<ProfileBoost>) {}

  getPlans() {
    return Object.entries(BOOST_PLANS).map(([key, plan]) => ({ key, ...plan, currency: 'INR' }));
  }

  async getStatus(userId: string) {
    const active = await this.boosts.findOne({
      where: { userId, endsAt: MoreThan(new Date()) },
      order: { endsAt: 'DESC' },
    });
    return { active: Boolean(active), boost: active ?? null, serverTime: new Date().toISOString() };
  }

  async activate(userId: string, planKey: BoostPlanKey, requestId: string) {
    const plan = BOOST_PLANS[planKey];
    return this.boosts.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProfileBoost);
      // Serialize purchases per user so simultaneous requests stack instead of overlapping.
      await manager.getRepository(User).findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      const duplicate = await repo.findOne({ where: { userId, requestId } });
      if (duplicate) return duplicate;

      const latest = await repo.findOne({ where: { userId }, order: { endsAt: 'DESC' } });
      const now = new Date();
      const startsAt = latest?.endsAt && latest.endsAt > now ? latest.endsAt : now;
      const endsAt = new Date(startsAt.getTime() + plan.durationMinutes * 60_000);
      return repo.save(repo.create({ userId, requestId, planKey, amount: plan.price, currency: 'INR', startsAt, endsAt }));
    });
  }
}
