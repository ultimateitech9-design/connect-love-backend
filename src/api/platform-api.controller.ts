import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Contact } from '../support/contact.entity';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { Payment } from '../platform/payment.entity';
import { SubscriptionPlan } from '../platform/subscription-plan.entity';
import { VerificationRequest } from '../platform/verification-request.entity';
import { PlatformNotification } from '../platform/platform-notification.entity';
import { AuditLog } from '../platform/audit-log.entity';
import { PlatformSetting } from '../platform/platform-setting.entity';
import { PlatformRole } from '../platform/role.entity';

@Controller('api')
export class PlatformApiController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(MatchRelation)
    private readonly matchRepo: Repository<MatchRelation>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(VerificationRequest)
    private readonly verificationRepo: Repository<VerificationRequest>,
    @InjectRepository(PlatformNotification)
    private readonly notificationRepo: Repository<PlatformNotification>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(PlatformSetting)
    private readonly settingRepo: Repository<PlatformSetting>,
    @InjectRepository(PlatformRole)
    private readonly roleRepo: Repository<PlatformRole>,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const totalUsers = await this.userRepo.count();
    const activeUsers = await this.userRepo.count({ where: { status: 'active' } });
    const premiumUsers = await this.userRepo.count({ where: [{ plan: 'gold' }, { plan: 'platinum' }] });
    const matchesDone = await this.matchRepo.count({ where: { status: MatchStatus.MATCHED } });
    const pendingReports = await this.contactRepo.count({ where: { status: 'open' } });
    const revenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.status = :status', { status: 'successful' })
      .getRawOne();
    const totalRevenue = Number(revenue?.total || 0);
    const users = await this.userRepo.find({ select: ['createdAt'] });
    const matches = await this.matchRepo.find({ select: ['createdAt'] });
    const monthly: Record<string, { m: string; users: number; matches: number }> = {};
    const ensureMonth = (date: Date) => {
      const key = date.toLocaleString('en-US', { month: 'short' });
      monthly[key] ||= { m: key, users: 0, matches: 0 };
      return monthly[key];
    };
    users.forEach((user) => {
      ensureMonth(user.createdAt).users += 1;
    });
    matches.forEach((match) => {
      ensureMonth(match.createdAt).matches += 1;
    });
    const growth = Object.values(monthly);

    return {
      stats: [
        { label: 'Total Users', value: String(totalUsers), delta: '+4.2%' },
        { label: 'Active Users', value: String(activeUsers), delta: '+2.8%' },
        { label: 'Matches Done', value: String(matchesDone), delta: '+6.1%' },
        { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, delta: '+11.6%' },
        { label: 'Pending Reports', value: String(pendingReports), delta: '-1.3%' },
        { label: 'Premium Users', value: String(premiumUsers), delta: '+2.1%' },
      ],
      growth,
    };
  }

  @Get('users')
  async users() {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
    return {
      users: users.map((user, index) => ({
        id: index + 1,
        name: user.name,
        email: user.email,
        account: user.plan === 'platinum' ? 'Premium Plus' : user.plan === 'gold' ? 'Premium' : 'Free Tier',
        status: user.status === 'active' ? 'Active' : user.status === 'banned' ? 'Banned' : 'Under Review',
      })),
    };
  }

  @Get('verification')
  async verification() {
    const pending = await this.verificationRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      queue: pending.map((request, index) => ({
          id: index + 1,
          name: request.user?.name || 'Unknown user',
          idType: request.idType,
          priority: request.priority === 'high' ? 'High' : request.priority === 'low' ? 'Low' : 'Normal',
          status: request.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        })),
    };
  }

  @Get('payments')
  async payments() {
    const plans = await this.planRepo.find({ order: { sortOrder: 'ASC' } });
    const users = await this.userRepo.find({ select: ['plan'] });
    const subscriberCounts = users.reduce<Record<string, number>>((acc, user) => {
      acc[user.plan] = (acc[user.plan] || 0) + 1;
      return acc;
    }, {});
    const transactions = await this.paymentRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.displayName,
        key: plan.name,
        price: Number(plan.price) === 0 ? '$0' : `$${Number(plan.price).toFixed(2)}`,
        rawPrice: Number(plan.price),
        period: 'monthly',
        features: plan.features || [],
        subscribers: subscriberCounts[plan.name] || 0,
        status: plan.status,
      })),
      transactions: transactions.map((payment) => ({
        id: payment.id,
        user: payment.user?.name || 'Deleted user',
        plan: payment.planName,
        amount: Number(payment.amount),
        status: payment.status,
        date: payment.createdAt.toISOString().split('T')[0],
      })),
    };
  }

  @Get('reports')
  async reports() {
    const open = await this.contactRepo.count({ where: { status: 'open' } });
    const reviewing = await this.contactRepo.count({ where: { status: 'reviewing' } });
    const closed = await this.contactRepo.count({ where: { status: 'closed' } });

    return {
      reports: [
        { type: 'Open', count: open },
        { type: 'Reviewing', count: reviewing },
        { type: 'Closed', count: closed },
      ],
    };
  }

  @Get('notifications')
  async notifications() {
    const notifications = await this.notificationRepo.find({ order: { createdAt: 'DESC' } });
    return {
      notifications: notifications.map((notification) => ({
        campaign: notification.campaign,
        type: notification.type,
        audience: notification.audience,
        status: notification.status.replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    };
  }

  @Get('security')
  async security() {
    const logs = await this.auditRepo.find({ order: { createdAt: 'ASC' }, take: 7 });
    return {
      loginActivity: logs.map((log, index) => ({
        day: log.createdAt.toLocaleDateString('en-US', { weekday: 'short' }),
        success: 80 + index * 7,
        failed: log.action.toLowerCase().includes('failed') ? 1 : 0,
      })),
    };
  }

  @Get('settings')
  async settings() {
    const setting = await this.settingRepo.findOne({ where: { key: 'platform_flags' } });
    const value = (setting?.value || {}) as Record<string, boolean>;
    return {
      settings: {
        maintenanceMode: value.maintenanceMode ?? false,
        userRegistrations: value.userRegistrations ?? true,
        matchingSystem: value.matchingSystem ?? true,
        premiumMemberships: value.premiumMemberships ?? true,
      },
    };
  }

  @Get('roles')
  async roles() {
    const users = await this.userRepo.find({ select: ['role'] });
    const roles = await this.roleRepo.find({ order: { role: 'ASC' } });
    const counts = users.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    return {
      roles: roles.map((role) => {
        const key = role.role.toLowerCase().replace(/ /g, '_');
        return {
          role: role.role,
          assignedUsers: counts[key] || 0,
          permissions: role.permissions,
          status: role.status,
        };
      }),
    };
  }

  @Get('logs')
  async logs() {
    const logs = await this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
    return {
      logs: logs.map((log) => ({
        user: log.user,
        activity: log.activity,
        ipAddress: log.ipAddress,
        action: log.action,
        module: log.module,
        createdAt: log.createdAt,
      })),
    };
  }

  @Get('super-admin')
  async superAdmin() {
    const superAdmin = await this.userRepo.findOne({ where: { role: 'super_admin' } });
    const logs = await this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 5 });
    const initials = (superAdmin?.name || 'Super Admin')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      superAdmin: {
        profile: {
          id: superAdmin?.id || 'SA-001',
          name: superAdmin?.name || 'Super Admin',
          email: superAdmin?.email || 'superadmin@connectlove.local',
          phone: '+1 555 0100',
          role: 'Super Admin',
          status: superAdmin?.status || 'active',
          initials,
          joinedAt: superAdmin?.createdAt?.toISOString().split('T')[0] || '2026-01-01',
          lastLogin: logs[0]?.createdAt?.toLocaleString() || 'Today',
          lastActive: superAdmin?.lastSeen?.toLocaleString() || 'Just now',
          twoFactorEnabled: true,
          ipWhitelist: ['127.0.0.1'],
          timezone: 'Asia/Calcutta',
          sessionTimeout: '24 hours',
        },
        accessLevel: {
          level: 'Owner',
          totalPermissions: 42,
          modulesAccessible: 10,
          description: 'Full platform access',
        },
        modules: [
          { name: 'Dashboard', icon: 'LayoutDashboard', route: '/super-admin', access: true, actions: [{ label: 'View', allowed: true }] },
          { name: 'Users', icon: 'Users', route: '/super-admin/users', access: true, actions: [{ label: 'Manage', allowed: true }] },
          { name: 'Security', icon: 'Lock', route: '/super-admin/security', access: true, actions: [{ label: 'Audit', allowed: true }] },
        ],
        activityLog: logs.map((log) => ({
          action: log.activity,
          time: log.createdAt.toLocaleString(),
          module: log.module,
        })),
      },
    };
  }
}
