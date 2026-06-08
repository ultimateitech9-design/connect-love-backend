import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Contact } from '../support/contact.entity';
import { Payment } from '../platform/payment.entity';
import { VerificationRequest } from '../platform/verification-request.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(VerificationRequest)
    private readonly verificationRepo: Repository<VerificationRequest>,
  ) {}

  async getStats() {
    const totalUsers = await this.userRepo.count();
    const premiumUsers = await this.userRepo.count({ where: [{ plan: 'gold' }, { plan: 'platinum' }] });
    const activeUsers = await this.userRepo.count({ where: { status: 'active' } });
    const openTickets = await this.contactRepo.count({ where: { status: 'open' } });
    const revenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.status = :status', { status: 'successful' })
      .getRawOne();

    return {
      totalUsers,
      premiumUsers,
      activeUsers,
      openTickets,
      revenueMtd: Number(revenue?.total || 0),
    };
  }

  async getAllUsers(page = 1, limit = 20) {
    const [users, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { users, total, page, limit };
  }

  async updateUserStatus(id: string, status: string) {
    await this.userRepo.update(id, { status: status as any });
    return { message: `User ${id} status updated to ${status}` };
  }

  async getAllContacts() {
    return this.contactRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getPayments() {
    return this.paymentRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getVerificationQueue() {
    return this.verificationRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getSubscriptions() {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });
    const free = users.filter((user) => user.plan === 'free').length;
    const gold = users.filter((user) => user.plan === 'gold').length;
    const platinum = users.filter((user) => user.plan === 'platinum').length;

    return {
      totals: { free, plus: gold, premium: platinum },
      users: users
        .filter((user) => user.plan !== 'free')
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          plan: user.plan === 'platinum' ? 'Premium' : 'Plus',
          joined: user.createdAt,
        })),
    };
  }

  async getAnalytics() {
    const users = await this.userRepo.find();
    const genderRatio = Object.entries(users.reduce<Record<string, number>>((acc, user) => {
      const key = user.gender || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([name, value]) => ({ name, value }));

    const geo = Object.entries(users.reduce<Record<string, number>>((acc, user) => {
      const key = user.city || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([city, count]) => ({ city, users: count }));

    const payments = await this.paymentRepo.find({ where: { status: 'successful' } });
    const revenueMonthly = payments.reduce<Record<string, number>>((acc, payment) => {
      const month = payment.createdAt.toLocaleString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + Number(payment.amount);
      return acc;
    }, {});

    return {
      genderRatio,
      geo,
      revenueMonthly: Object.entries(revenueMonthly).map(([m, rev]) => ({ m, rev })),
    };
  }
}
