import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/user.entity';
import { Contact } from '../support/contact.entity';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { Payment } from '../platform/payment.entity';
import { SubscriptionPlan } from '../platform/subscription-plan.entity';
import { VerificationRequest, VerificationStatus } from '../platform/verification-request.entity';
import { NotificationStatus, PlatformNotification } from '../platform/platform-notification.entity';
import { AuditLog } from '../platform/audit-log.entity';
import { PlatformSetting } from '../platform/platform-setting.entity';
import { PlatformRole } from '../platform/role.entity';
import { IsEmail, IsString, MinLength, IsOptional, IsNumber, IsArray, IsBoolean, IsDateString, IsInt, Max, MaxLength, Min, Matches } from 'class-validator';
import { Roles, RolesGuard } from '../auth/roles.guard';

export class CreatePlatformUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class CreateNotificationDto {
  @IsString()
  campaign: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^(\/|https?:\/\/)/, { message: 'ctaUrl must be a site path or an http(s) URL.' })
  ctaUrl?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^(\/|https?:\/\/)/, { message: 'ctaUrl must be a site path or an http(s) URL.' })
  ctaUrl?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class RejectNotificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class CreateRoleDto {
  @IsString()
  role: string;

  @IsOptional()
  @IsNumber()
  permissions?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class SavePlanDto {
  @IsString()
  displayName: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdatePlatformUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  height?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personality?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class ActivateUserPlanDto {
  @IsString()
  userId: string;

  @IsString()
  plan: 'free' | 'gold' | 'platinum';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;
}

@Controller('api')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
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

  private dayKey(date: Date) {
    return date.toLocaleString('en-US', { weekday: 'short' });
  }

  private periodDelta(current: number, previous: number) {
    if (previous === 0) return current === 0 ? '0%' : '+100%';
    const value = ((current - previous) / previous) * 100;
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  private normalizeRole(value?: string) {
    return String(value || 'user').toLowerCase().replace(/[- ]/g, '_');
  }

  private requestUser(request: any): { userId: string; role: string } {
    return {
      userId: String(request?.user?.userId || ''),
      role: this.normalizeRole(request?.user?.role),
    };
  }

  private statusLabel(status: string) {
    return status === 'active' ? 'Active' : status === 'banned' ? 'Banned' : status === 'suspended' ? 'Suspended' : 'Under Review';
  }

  private campaignResponse(campaign: PlatformNotification) {
    const ctr = campaign.impressions > 0 ? Number(((campaign.clicks / campaign.impressions) * 100).toFixed(2)) : 0;
    return {
      id: campaign.id,
      campaign: campaign.campaign,
      description: campaign.description,
      type: campaign.type,
      audience: campaign.audience,
      discountPercent: campaign.discountPercent,
      ctaLabel: campaign.ctaLabel,
      ctaUrl: campaign.ctaUrl,
      placement: campaign.placement,
      status: campaign.status,
      createdByUserId: campaign.createdByUserId,
      createdByRole: campaign.createdByRole,
      approvedByUserId: campaign.approvedByUserId,
      submittedAt: campaign.submittedAt,
      approvedAt: campaign.approvedAt,
      rejectedAt: campaign.rejectedAt,
      rejectionReason: campaign.rejectionReason,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      dismissals: campaign.dismissals,
      ctr,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  private validateCampaignDates(startsAt?: Date | null, endsAt?: Date | null) {
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Campaign end date must be after its start date.');
    }
  }

  private canAccessCampaign(campaign: PlatformNotification, actor: { userId: string; role: string }) {
    return actor.role === 'admin'
      || actor.role === 'super_admin'
      || (actor.role === 'sales' && campaign.createdByUserId === actor.userId);
  }

  private audienceMatches(audience: string, user: User) {
    const value = String(audience || 'All users').trim().toLowerCase();
    if (value === 'all' || value === 'all users' || value === 'everyone') return true;
    if (value.includes('premium')) return user.plan === 'gold' || user.plan === 'platinum';
    if (value.includes('free')) return user.plan === 'free';
    if (value.includes('gold')) return user.plan === 'gold';
    if (value.includes('platinum') || value.includes('elite')) return user.plan === 'platinum';
    if (value.startsWith('city:')) return String(user.city || '').toLowerCase() === value.slice(5).trim();
    return false;
  }

  private async visibleCampaignForUser(id: string, request: any) {
    const user = await this.userRepo.findOne({ where: { id: this.requestUser(request).userId } });
    const campaign = await this.notificationRepo.findOne({ where: { id, status: 'active' } });
    const now = new Date();
    if (!user
      || !campaign
      || (campaign.startsAt && campaign.startsAt > now)
      || (campaign.endsAt && campaign.endsAt < now)
      || !this.audienceMatches(campaign.audience, user)) {
      throw new NotFoundException('Campaign not found.');
    }
    return campaign;
  }

  private initials(name: string) {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private currencySymbol(currency?: string) {
    return String(currency || 'USD').toUpperCase() === 'INR' ? '₹' : '$';
  }

  private normalizeSubscriptionPlan(plan: SubscriptionPlan) {
    return {
      displayName: plan.displayName,
      price: Number(plan.price),
      currency: plan.currency,
      features: plan.features || [],
    };
  }

  private async audit(module: string, action: string, activity: string) {
    await this.auditRepo.save(this.auditRepo.create({
      user: 'system',
      module,
      action,
      activity,
      ipAddress: '127.0.0.1',
    }));
  }

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
    const users = await this.userRepo.find({ select: ['createdAt', 'plan', 'status'] });
    const matches = await this.matchRepo.find({ select: ['createdAt'] });
    const payments = await this.paymentRepo.find({ where: { status: 'successful' }, select: ['amount', 'createdAt'] });
    const reports = await this.contactRepo.find({ select: ['createdAt', 'status'] });
    const now = Date.now();
    const currentStart = now - 30 * 86400000;
    const previousStart = now - 60 * 86400000;
    const countPeriod = <T extends { createdAt: Date }>(rows: T[], start: number, end: number) =>
      rows.filter((row) => new Date(row.createdAt).getTime() >= start && new Date(row.createdAt).getTime() < end).length;
    const sumPeriod = (rows: Payment[], start: number, end: number) =>
      rows.filter((row) => new Date(row.createdAt).getTime() >= start && new Date(row.createdAt).getTime() < end)
        .reduce((sum, row) => sum + Number(row.amount), 0);
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
        { label: 'Total Users', value: String(totalUsers), delta: this.periodDelta(countPeriod(users, currentStart, now), countPeriod(users, previousStart, currentStart)) },
        { label: 'Active Users', value: String(activeUsers), delta: 'Live DB' },
        { label: 'Matches Done', value: String(matchesDone), delta: this.periodDelta(countPeriod(matches, currentStart, now), countPeriod(matches, previousStart, currentStart)) },
        { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, delta: this.periodDelta(sumPeriod(payments, currentStart, now), sumPeriod(payments, previousStart, currentStart)) },
        { label: 'Pending Reports', value: String(pendingReports), delta: this.periodDelta(countPeriod(reports, currentStart, now), countPeriod(reports, previousStart, currentStart)) },
        { label: 'Premium Users', value: String(premiumUsers), delta: this.periodDelta(countPeriod(users.filter((user) => user.plan !== 'free'), currentStart, now), countPeriod(users.filter((user) => user.plan !== 'free'), previousStart, currentStart)) },
      ],
      growth,
    };
  }

  @Get('users')
  @Roles('admin', 'super_admin', 'sales', 'support')
  async users(
    @Req() request: any,
    @Query('search') search?: string,
    @Query('page') pageValue?: string,
    @Query('limit') limitValue?: string,
  ) {
    const page = Math.max(1, Number.parseInt(pageValue || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(limitValue || '100', 10) || 100));
    const query = this.userRepo.createQueryBuilder('user')
      .select([
        'user.id', 'user.name', 'user.email', 'user.role', 'user.plan',
        'user.city', 'user.lastSeen', 'user.updatedAt', 'user.createdAt',
        'user.isVerified', 'user.status',
      ])
      .orderBy('user.createdAt', 'DESC');

    const term = search?.trim().toLowerCase();
    if (term) {
      query.andWhere(`(
        LOWER(user.id) LIKE :term OR
        LOWER(user.name) LIKE :term OR
        LOWER(user.email) LIKE :term
      )`, { term: `%${term}%` });
    }

    const [users, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
    const actor = this.requestUser(request);
    return {
      total,
      page,
      limit,
      hasMore: page * limit < total,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        ...(actor.role === 'super_admin' || actor.role === 'admin' ? { role: user.role } : {}),
        plan: user.plan,
        account: user.plan === 'platinum' ? 'Diamond' : user.plan === 'gold' ? 'Gold' : 'Free',
        city: user.city || 'Unknown',
        joined: user.createdAt,
        lastActive: user.lastSeen || user.updatedAt,
        isVerified: user.isVerified,
        status: user.status === 'active' ? 'Active' : user.status === 'banned' ? 'Banned' : 'Under Review',
      })),
    };
  }

  @Post('users')
  @Roles('super_admin')
  async createUser(@Body() body: CreatePlatformUserDto) {
    const existing = await this.userRepo.findOne({ where: { email: body.email } });
    if (existing) return { message: 'A user with this email already exists.', user: existing };

    const role = 'user';
    const password = await bcrypt.hash(body.password, 12);
    const user = await this.userRepo.save(this.userRepo.create({
      name: body.name,
      email: body.email,
      password,
      role,
      plan: role === 'user' ? 'free' : 'platinum',
      status: 'active',
      isVerified: role !== 'user',
      onboardingCompleted: role !== 'user',
    }));
    await this.audit('Users', 'Create', `Created ${role} account ${user.email}`);
    const { password: _, ...safe } = user as any;
    return { user: safe };
  }

  /** Super Admin-only manual subscription activation. This changes the same
   * user plan and expiry fields used by the payment flow, so entitlements take
   * effect immediately across discovery, matches, messages, and media. */
  @Post('plan-activations')
  @Roles('super_admin')
  async activateUserPlan(@Body() body: ActivateUserPlanDto, @Req() request: any) {
    const userId = String(body.userId || '').trim();
    const plan = String(body.plan || '').toLowerCase();
    if (!userId) throw new BadRequestException('Select a user before activating a plan.');
    if (!['free', 'gold', 'platinum'].includes(plan)) throw new BadRequestException('Choose Free, Gold, or Diamond.');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User account was not found.');

    const durationDays = Math.max(1, Math.min(365, Number(body.durationDays) || 30));
    let expiresAt: Date | null = null;
    if (plan !== 'free') {
      // Manual activation replaces the current plan duration. A fresh admin
      // decision must be predictable, rather than silently extending an old plan.
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    user.plan = plan as User['plan'];
    user.planExpiresAt = expiresAt as any;
    const saved = await this.userRepo.save(user);
    const actor = this.requestUser(request);
    const planName = plan === 'platinum' ? 'Diamond' : plan[0].toUpperCase() + plan.slice(1);
    await this.audit(
      'Plan Activation',
      'Manual Activation',
      `${planName} manually activated for ${saved.email} by ${actor.userId || 'super admin'}${expiresAt ? ` for ${durationDays} day(s)` : ''}.`,
    );

    return {
      success: true,
      user: { id: saved.id, name: saved.name, email: saved.email, plan: saved.plan },
      plan: saved.plan,
      expiresAt,
      message: plan === 'free'
        ? `Free plan is now active for ${saved.name}.`
        : `${planName} is active for ${saved.name} until ${expiresAt.toISOString()}.`,
    };
  }

  @Get('users/:id')
  @Roles('admin', 'super_admin', 'sales', 'support')
  async getUserDetails(@Param('id') id: string, @Req() request: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    const actor = this.requestUser(request);
    const necessary = {
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      isVerified: user.isVerified,
      plan: user.plan,
      account: user.plan === 'platinum' ? 'Diamond' : user.plan === 'gold' ? 'Gold' : 'Free',
      ...(actor.role === 'super_admin' || actor.role === 'admin' ? { role: user.role } : {}),
      status: this.statusLabel(user.status),
      joined: user.createdAt,
      lastActive: user.lastSeen || user.updatedAt,
    };
    return {
      user: actor.role === 'super_admin' ? {
        ...necessary,
        age: user.age,
        birthDate: user.birthDate,
        gender: user.gender,
        religion: user.religion,
        profession: user.profession,
        height: user.height,
        city: user.city,
        bio: user.bio,
        interests: user.interests || [],
        personality: user.personalityWords || [],
        hobbies: user.hobbies || [],
        avatarUrl: user.avatarUrl,
        photos: user.photos || [],
      } : necessary,
    };
  }

  @Patch('users/:id')
  @Roles('super_admin')
  async updateUser(@Param('id') id: string, @Body() body: UpdatePlatformUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    if (body.email && body.email !== user.email) {
      const existing = await this.userRepo.findOne({ where: { email: body.email } });
      if (existing && existing.id !== id) return { message: 'A user with this email already exists.', user };
    }

    const plan = ['free', 'gold', 'platinum'].includes(String(body.plan)) ? body.plan : undefined;
    const status = ['active', 'suspended', 'banned', 'pending_verification'].includes(String(body.status)) ? body.status : undefined;
    const role = ['user', 'admin', 'super_admin', 'sales', 'support'].includes(String(body.role)) ? body.role : undefined;

    Object.assign(user, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.birthDate !== undefined ? { birthDate: body.birthDate ? new Date(body.birthDate) : null } : {}),
      ...(body.gender !== undefined ? { gender: body.gender } : {}),
      ...(body.religion !== undefined ? { religion: body.religion } : {}),
      ...(body.profession !== undefined ? { profession: body.profession } : {}),
      ...(body.height !== undefined ? { height: body.height } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.interests !== undefined ? { interests: body.interests } : {}),
      ...(body.hobbies !== undefined ? { hobbies: body.hobbies } : {}),
      ...(body.personality !== undefined ? { personalityWords: body.personality } : {}),
      ...(body.photos !== undefined ? { photos: body.photos } : {}),
      ...(plan ? { plan } : {}),
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
      ...(body.isVerified !== undefined ? { isVerified: body.isVerified } : {}),
    });

    const saved = await this.userRepo.save(user);
    await this.audit('Users', 'Update', `Updated user profile ${saved.email}`);
    const { password: _, ...safe } = saved as any;
    return { success: true, user: safe };
  }

  @Patch('users/:id/status')
  @Roles('admin', 'super_admin')
  async updateUserStatus(@Param('id') id: string, @Body('status') status: 'active' | 'suspended' | 'banned' | 'pending_verification') {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    user.status = status;
    await this.userRepo.save(user);
    await this.audit('Users', 'Update Status', `Updated user ${user.email} status to ${status}`);
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status,
        isVerified: user.isVerified,
      },
    };
  }

  @Delete('users/:id')
  @Roles('super_admin')
  async deleteUser(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    await this.userRepo.remove(user);
    await this.audit('Users', 'Delete', `Deleted user account ${user.email}`);
    return { success: true };
  }


  @Get('verification')
  async verification(@Req() request: any) {
    const includePrivateMedia = this.requestUser(request).role === 'super_admin';
    const pending = await this.verificationRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const kycUsers = await this.userRepo.find({
      where: { kycLivePhoto: Not(IsNull()), role: 'user' } as any,
      order: { kycVerifiedAt: 'DESC', updatedAt: 'DESC' } as any,
      take: 100,
    });
    const reviewUsers = await this.userRepo.find({
      where: [
        { role: 'user', isVerified: false, status: In(['pending_verification', 'active']) } as any,
      ],
      order: { updatedAt: 'DESC', createdAt: 'DESC' } as any,
      take: 100,
    });
    const requestedUserIds = new Set(pending.map((request) => request.userId));
    const kycUserIds = new Set(kycUsers.map((user) => user.id));

    return {
      queue: [
        ...pending.map((request) => ({
          id: request.id,
          name: request.user?.name || 'Unknown user',
          email: request.user?.email || '',
          idType: request.idType,
          priority: request.priority === 'high' ? 'High' : request.priority === 'low' ? 'Low' : 'Normal',
          status: request.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          date: request.createdAt,
          ...(includePrivateMedia ? {
            documents: request.documents || [],
            photo: request.user?.avatarUrl || null,
            birthDate: request.user?.birthDate || null,
          } : {}),
        })),
        ...kycUsers
          .filter((user) => !requestedUserIds.has(user.id))
          .map((user) => ({
            id: `kyc-${user.id}`,
            name: user.name || 'Unknown user',
            email: user.email || '',
            idType: 'Video KYC',
            priority: user.kycMatched ? 'Normal' : 'High',
            status: user.isVerified ? 'Approved' : user.kycMatched ? 'Pending' : 'Under Review',
            date: user.kycVerifiedAt || user.updatedAt || user.createdAt,
            ...(includePrivateMedia ? {
              documents: [user.kycLivePhoto].filter(Boolean),
              photo: user.avatarUrl || user.photos?.[0] || null,
              birthDate: user.birthDate || null,
              matchScore: user.kycMatchScore,
            } : {}),
          })),
        ...reviewUsers
          .filter((user) => !requestedUserIds.has(user.id) && !kycUserIds.has(user.id))
          .map((user) => ({
            id: `user-${user.id}`,
            name: user.name || 'Unknown user',
            email: user.email || '',
            idType: user.status === 'pending_verification' ? 'Profile Verification' : 'Profile Review',
            priority: user.status === 'pending_verification' ? 'High' : 'Low',
            status: user.status === 'pending_verification' ? 'Pending' : 'Unverified',
            date: user.updatedAt || user.createdAt,
            ...(includePrivateMedia ? {
              documents: user.photos || [],
              photo: user.avatarUrl || user.photos?.[0] || null,
              birthDate: user.birthDate || null,
            } : {}),
          })),
      ],
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
      plans: plans.map((plan) => {
        const details = this.normalizeSubscriptionPlan(plan);
        return {
          id: plan.id,
          name: details.displayName,
          key: plan.name,
          currency: details.currency,
          price: details.price === 0 ? `${this.currencySymbol(details.currency)}0` : `${this.currencySymbol(details.currency)}${details.price.toFixed(2)}`,
          rawPrice: details.price,
          period: 'monthly',
          features: details.features,
          subscribers: subscriberCounts[plan.name] || 0,
          status: plan.status,
        };
      }),
      transactions: transactions.map((payment) => ({
        id: payment.id,
        user: payment.user?.name || 'Deleted user',
        plan: payment.planName.startsWith('boost:') ? `Profile Boost - ${payment.planName.slice(6).replace(/_/g, ' ')}` : payment.planName,
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
  @Roles('admin', 'super_admin', 'sales')
  async notifications(@Req() request: any) {
    const actor = this.requestUser(request);
    const notifications = await this.notificationRepo.find({
      ...(actor.role === 'sales' ? { where: { createdByUserId: actor.userId } } : {}),
      order: { createdAt: 'DESC' },
    });
    return {
      notifications: notifications.map((notification) => this.campaignResponse(notification)),
    };
  }

  @Post('plans')
  async createPlan(@Body() body: SavePlanDto) {
    const key = body.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const plan = await this.planRepo.save(this.planRepo.create({
      name: key,
      displayName: body.displayName,
      price: Number(body.price || 0).toFixed(2),
      features: body.features || [],
      status: body.status === 'inactive' ? 'inactive' : 'active',
      sortOrder: await this.planRepo.count() + 1,
    }));
    await this.audit('Admin', 'Plan created', `Created subscription plan ${plan.displayName}`);
    return plan;
  }

  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() body: SavePlanDto) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found.');
    plan.displayName = body.displayName;
    plan.price = Number(body.price || 0).toFixed(2);
    plan.features = body.features || plan.features;
    plan.status = body.status === 'inactive' ? 'inactive' : 'active';
    await this.planRepo.save(plan);
    await this.audit('Admin', 'Plan updated', `Updated subscription plan ${plan.displayName}`);
    return plan;
  }

  @Post('notifications')
  @Roles('admin', 'super_admin', 'sales')
  async createNotification(@Body() body: CreateNotificationDto, @Req() request: any) {
    const actor = this.requestUser(request);
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    this.validateCampaignDates(startsAt, endsAt);
    const activateNow = (actor.role === 'admin' || actor.role === 'super_admin') && body.status === 'active';
    const now = new Date();
    const notification = await this.notificationRepo.save(this.notificationRepo.create({
      campaign: body.campaign || 'Untitled campaign',
      type: body.type || 'In-app',
      audience: body.audience || 'All users',
      description: body.description,
      discountPercent: body.discountPercent ?? null,
      ctaLabel: body.ctaLabel?.trim() || 'View offer',
      ctaUrl: body.ctaUrl?.trim() || '/user/premium',
      placement: 'user_dashboard',
      status: activateNow ? 'active' : 'draft',
      createdByUserId: actor.userId,
      createdByRole: actor.role,
      approvedByUserId: activateNow ? actor.userId : null,
      approvedAt: activateNow ? now : null,
      startsAt,
      endsAt,
    }));
    await this.audit('Campaigns', 'Create', `${actor.role} created campaign ${notification.campaign}`);
    return this.campaignResponse(notification);
  }

  @Patch('notifications/:id')
  @Roles('admin', 'super_admin', 'sales')
  async updateNotification(@Param('id') id: string, @Body() body: UpdateNotificationDto, @Req() request: any) {
    const actor = this.requestUser(request);
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Campaign not found.');
    if (!this.canAccessCampaign(notification, actor)) throw new ForbiddenException('You cannot edit this campaign.');
    if (actor.role === 'sales' && !['draft', 'rejected'].includes(notification.status)) {
      throw new ForbiddenException('Sales can edit only draft or rejected campaigns.');
    }
    const startsAt = body.startsAt !== undefined ? (body.startsAt ? new Date(body.startsAt) : null) : notification.startsAt;
    const endsAt = body.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : notification.endsAt;
    this.validateCampaignDates(startsAt, endsAt);
    Object.assign(notification, {
      ...(body.campaign !== undefined ? { campaign: body.campaign.trim() } : {}),
      ...(body.audience !== undefined ? { audience: body.audience.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description.trim() } : {}),
      ...(body.discountPercent !== undefined ? { discountPercent: body.discountPercent } : {}),
      ...(body.ctaLabel !== undefined ? { ctaLabel: body.ctaLabel.trim() } : {}),
      ...(body.ctaUrl !== undefined ? { ctaUrl: body.ctaUrl.trim() } : {}),
      ...(body.startsAt !== undefined ? { startsAt } : {}),
      ...(body.endsAt !== undefined ? { endsAt } : {}),
      ...(notification.status === 'rejected' ? {
        status: 'draft' as NotificationStatus,
        rejectedAt: null,
        rejectionReason: null,
      } : {}),
    });
    const saved = await this.notificationRepo.save(notification);
    await this.audit('Campaigns', 'Update', `${actor.role} updated campaign ${saved.campaign}`);
    return this.campaignResponse(saved);
  }

  @Post('notifications/:id/submit')
  @Roles('admin', 'super_admin', 'sales')
  async submitNotification(@Param('id') id: string, @Req() request: any) {
    const actor = this.requestUser(request);
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Campaign not found.');
    if (!this.canAccessCampaign(notification, actor)) throw new ForbiddenException('You cannot submit this campaign.');
    if (!['draft', 'rejected'].includes(notification.status)) {
      throw new BadRequestException('Only draft or rejected campaigns can be submitted.');
    }
    notification.status = 'pending_approval';
    notification.submittedAt = new Date();
    notification.rejectedAt = null;
    notification.rejectionReason = null;
    const saved = await this.notificationRepo.save(notification);
    await this.audit('Campaigns', 'Submit', `${actor.role} submitted campaign ${saved.campaign} for approval`);
    return this.campaignResponse(saved);
  }

  @Post('notifications/:id/approve')
  @Roles('admin', 'super_admin')
  async approveNotification(@Param('id') id: string, @Req() request: any) {
    const actor = this.requestUser(request);
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Campaign not found.');
    if (!['pending_approval', 'draft'].includes(notification.status)) {
      throw new BadRequestException('Only submitted or admin-created draft campaigns can be approved.');
    }
    notification.status = 'active';
    notification.approvedByUserId = actor.userId;
    notification.approvedAt = new Date();
    notification.rejectedAt = null;
    notification.rejectionReason = null;
    const saved = await this.notificationRepo.save(notification);
    await this.audit('Campaigns', 'Approve', `${actor.role} approved campaign ${saved.campaign}`);
    return this.campaignResponse(saved);
  }

  @Post('notifications/:id/reject')
  @Roles('admin', 'super_admin')
  async rejectNotification(@Param('id') id: string, @Body() body: RejectNotificationDto, @Req() request: any) {
    const actor = this.requestUser(request);
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Campaign not found.');
    if (notification.status !== 'pending_approval') throw new BadRequestException('Only submitted campaigns can be rejected.');
    notification.status = 'rejected';
    notification.rejectionReason = body.reason.trim();
    notification.rejectedAt = new Date();
    notification.approvedByUserId = null;
    notification.approvedAt = null;
    const saved = await this.notificationRepo.save(notification);
    await this.audit('Campaigns', 'Reject', `${actor.role} rejected campaign ${saved.campaign}`);
    return this.campaignResponse(saved);
  }

  @Patch('notifications/:id/status')
  @Roles('admin', 'super_admin')
  async updateNotificationStatus(@Param('id') id: string, @Body('status') status: NotificationStatus) {
    const allowed: NotificationStatus[] = ['active', 'paused', 'expired'];
    if (!allowed.includes(status)) throw new BadRequestException('Unsupported campaign status change.');
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Campaign not found.');
    notification.status = status;
    await this.notificationRepo.save(notification);
    await this.audit('Campaigns', 'Status', `Changed ${notification.campaign} to ${status}`);
    return this.campaignResponse(notification);
  }

  @Delete('notifications/:id')
  @Roles('admin', 'super_admin', 'sales')
  async deleteNotification(@Param('id') id: string, @Req() request: any) {
    const actor = this.requestUser(request);
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) return { deleted: true };
    if (!this.canAccessCampaign(notification, actor)) throw new ForbiddenException('You cannot delete this campaign.');
    if (actor.role === 'sales' && !['draft', 'rejected'].includes(notification.status)) {
      throw new ForbiddenException('Sales can delete only draft or rejected campaigns.');
    }
    await this.notificationRepo.remove(notification);
    await this.audit('Campaigns', 'Delete', `${actor.role} deleted campaign ${notification.campaign}`);
    return { deleted: true };
  }

  @Get('campaigns/active')
  @Roles('user')
  async activeUserCampaigns(@Req() request: any) {
    const user = await this.userRepo.findOne({ where: { id: this.requestUser(request).userId } });
    if (!user) throw new NotFoundException('User not found.');
    const now = new Date();
    const campaigns = await this.notificationRepo.find({
      where: { status: 'active' },
      order: { approvedAt: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
    return {
      campaigns: campaigns
        .filter((campaign) => (!campaign.startsAt || campaign.startsAt <= now)
          && (!campaign.endsAt || campaign.endsAt >= now)
          && this.audienceMatches(campaign.audience, user))
        .slice(0, 10)
        .map((campaign) => ({
          id: campaign.id,
          title: campaign.campaign,
          description: campaign.description,
          discountPercent: campaign.discountPercent,
          ctaLabel: campaign.ctaLabel,
          ctaUrl: campaign.ctaUrl,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
        })),
    };
  }

  @Post('campaigns/:id/impression')
  @Roles('user')
  async recordCampaignImpression(@Param('id') id: string, @Req() request: any) {
    await this.visibleCampaignForUser(id, request);
    await this.notificationRepo.increment({ id }, 'impressions', 1);
    return { recorded: true };
  }

  @Post('campaigns/:id/click')
  @Roles('user')
  async recordCampaignClick(@Param('id') id: string, @Req() request: any) {
    await this.visibleCampaignForUser(id, request);
    await this.notificationRepo.increment({ id }, 'clicks', 1);
    return { recorded: true };
  }

  @Post('campaigns/:id/dismiss')
  @Roles('user')
  async recordCampaignDismiss(@Param('id') id: string, @Req() request: any) {
    await this.visibleCampaignForUser(id, request);
    await this.notificationRepo.increment({ id }, 'dismissals', 1);
    return { recorded: true };
  }

  @Get('security')
  @Roles('super_admin')
  async security() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const logs = await this.auditRepo
      .createQueryBuilder('log')
      .where('log.createdAt >= :start', { start })
      .orderBy('log.createdAt', 'ASC')
      .getMany();
    const weekly = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      return {
        key: date.toISOString().slice(0, 10),
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        success: 0,
        failed: 0,
      };
    });
    const byDate = new Map(weekly.map((row) => [row.key, row]));
    for (const log of logs) {
      const row = byDate.get(log.createdAt.toISOString().slice(0, 10));
      if (!row || log.module !== 'Authentication') continue;
      if (log.action.toLowerCase() === 'failed') row.failed += 1;
      else if (log.loginAt) row.success += 1;
    }
    const activeCutoff = new Date(now.getTime() - 2 * 60 * 1000);
    const activeSessions = await this.auditRepo
      .createQueryBuilder('log')
      .where('log.module = :module', { module: 'Authentication' })
      .andWhere('log.loginAt IS NOT NULL')
      .andWhere('log.logoutAt IS NULL')
      .andWhere('log.lastActivityAt >= :activeCutoff', { activeCutoff })
      .getCount();
    const successfulLogins = weekly.reduce((total, row) => total + row.success, 0);
    const failedLogins = weekly.reduce((total, row) => total + row.failed, 0);
    const blockedAccounts = await this.userRepo.count({ where: { status: 'banned' } });
    return {
      loginActivity: weekly.map(({ day, success, failed }) => ({ day, success, failed })),
      loginAttempts: successfulLogins + failedLogins,
      failedLogins,
      activeSessions,
      blockedAccounts,
    };
  }

  @Get('settings')
  @Roles('super_admin')
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

  @Patch('settings')
  @Roles('super_admin')
  async updateSettings(@Body() settings: Record<string, boolean>) {
    await this.settingRepo.save(this.settingRepo.create({ key: 'platform_flags', value: settings }));
    await this.audit('Settings', 'Update', 'Updated platform settings');
    return { settings };
  }

  @Get('roles')
  @Roles('super_admin')
  async roles() {
    const users = await this.userRepo.find({ select: ['role'] });
    const roles = (await this.roleRepo.find({ order: { role: 'ASC' } })).filter((role) => {
      const key = role.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
      return key !== 'data_entry' && key !== 'finance' && key !== 'marketing';
    });
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

  @Post('roles')
  @Roles('super_admin')
  async createRole(@Body() body: CreateRoleDto) {
    const roleKey = body.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (roleKey === 'data_entry' || roleKey === 'finance' || roleKey === 'marketing') {
      throw new BadRequestException('This role is no longer available.');
    }
    const role = await this.roleRepo.save(this.roleRepo.create({
      role: body.role,
      permissions: body.permissions ?? 1,
      status: body.status || 'Active',
    }));
    await this.audit('Roles', 'Create', `Created role ${role.role}`);
    return role;
  }

  @Patch('roles/:id')
  @Roles('super_admin')
  async updateRole(@Param('id') id: string, @Body() body: Partial<PlatformRole>) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) return { message: 'Role not found.' };
    if (body.role) {
      const roleKey = body.role.trim().toLowerCase().replace(/[\s-]+/g, '_');
      if (roleKey === 'data_entry' || roleKey === 'finance' || roleKey === 'marketing') {
        throw new BadRequestException('This role is no longer available.');
      }
    }
    Object.assign(role, {
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.permissions !== undefined ? { permissions: body.permissions } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    });
    await this.roleRepo.save(role);
    await this.audit('Roles', 'Update', `Updated role ${role.role}`);
    return role;
  }

  @Patch('verification/:id/status')
  async updateVerification(@Param('id') id: string, @Body('status') status: VerificationStatus) {
    if (id.startsWith('user-')) {
      const userId = id.replace(/^user-/, '');
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) return { message: 'Verification user not found.' };
      await this.userRepo.update(userId, {
        isVerified: status === 'approved',
        status: status === 'rejected' ? 'pending_verification' : 'active',
      } as any);
      await this.audit('Verification', 'Update', `Profile verification ${userId} marked ${status}`);
      return { id, userId, status };
    }

    if (id.startsWith('kyc-')) {
      const userId = id.replace(/^kyc-/, '');
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) return { message: 'KYC user not found.' };
      await this.userRepo.update(userId, {
        isVerified: status === 'approved',
        ...(status === 'approved' ? { kycVerifiedAt: user.kycVerifiedAt || new Date() } : {}),
        ...(status === 'rejected' ? {
          kycLivePhoto: null,
          kycMatched: false,
          kycMatchScore: null,
          kycVerifiedAt: null,
        } : {}),
      } as any);
      await this.audit('Verification', 'Update', `Video KYC ${userId} marked ${status}`);
      return { id, userId, status };
    }

    const request = await this.verificationRepo.findOne({ where: { id }, relations: ['user'] });
    if (!request) return { message: 'Verification request not found.' };
    request.status = status;
    await this.verificationRepo.save(request);
    if (status === 'approved' || status === 'rejected') {
      await this.userRepo.update(request.userId, { isVerified: status === 'approved' });
    }
    await this.audit('Verification', 'Update', `Verification ${id} marked ${status}`);
    return request;
  }

  @Get('sales/overview')
  @Roles('sales', 'admin', 'super_admin')
  async salesOverview() {
    const payments = await this.paymentRepo.find({ relations: ['user'], order: { createdAt: 'ASC' } });
    const users = await this.userRepo.find();
    const successfulPayments = payments.filter((payment) => payment.status === 'successful');
    const now = Date.now();
    const currentStart = now - 30 * 86400000;
    const previousStart = now - 60 * 86400000;
    const premiumUsers = users.filter((user) => user.plan !== 'free');
    const currentPremiumSignups = premiumUsers.filter((user) => new Date(user.createdAt).getTime() >= currentStart).length;
    const previousPremiumSignups = premiumUsers.filter((user) => {
      const created = new Date(user.createdAt).getTime();
      return created >= previousStart && created < currentStart;
    }).length;
    const paymentCountByUser = successfulPayments.reduce<Record<string, number>>((acc, payment) => {
      if (payment.userId) acc[payment.userId] = (acc[payment.userId] || 0) + 1;
      return acc;
    }, {});
    const payingUserIds = Object.keys(paymentCountByUser);
    const renewedUserIds = payingUserIds.filter((userId) => paymentCountByUser[userId] > 1);
    const renewalRate = payingUserIds.length ? (renewedUserIds.length / payingUserIds.length) * 100 : null;
    const conversionRate = users.length ? (premiumUsers.length / users.length) * 100 : 0;
    const revenueData: Record<string, { day: string; revenue: number; signups: number }> = {};
    payments.forEach((payment) => {
      const day = this.dayKey(payment.createdAt);
      revenueData[day] ||= { day, revenue: 0, signups: 0 };
      revenueData[day].revenue += Number(payment.amount);
    });
    users.forEach((user) => {
      const day = this.dayKey(user.createdAt);
      revenueData[day] ||= { day, revenue: 0, signups: 0 };
      revenueData[day].signups += 1;
    });
    const planSplit = Object.entries(users.reduce<Record<string, number>>((acc, user) => {
      acc[user.plan] = (acc[user.plan] || 0) + 1;
      return acc;
    }, {})).map(([name, value]) => ({ name, value }));
    return {
      kpis: [
        { label: 'Total Subscriptions', value: String(premiumUsers.length), delta: Number(this.periodDelta(currentPremiumSignups, previousPremiumSignups).replace('%', '')) },
        { label: 'New Premium Users', value: String(currentPremiumSignups), delta: Number(this.periodDelta(currentPremiumSignups, previousPremiumSignups).replace('%', '')) },
        { label: 'Renewal Rate', value: renewalRate === null ? '—' : `${renewalRate.toFixed(1)}%`, delta: 0 },
        { label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, delta: 0 },
      ],
      revenueData: Object.values(revenueData),
      planSplit,
      recentUpgrades: successfulPayments.slice(-5).reverse().map((p) => ({
        name: p.user?.name || 'Deleted user',
        plan: p.planName,
        amt: `${this.currencySymbol(p.currency)}${Number(p.amount).toFixed(2)}`,
        t: p.createdAt.toLocaleString(),
      })),
    };
  }

  @Get('sales/retention')
  @Roles('sales', 'admin', 'super_admin')
  async salesRetention() {
    const users = await this.userRepo.find({ select: ['plan', 'status', 'isVerified'] });
    const plans = [
      { key: 'free', label: 'Free' },
      { key: 'gold', label: 'Gold' },
      { key: 'platinum', label: 'Diamond' },
    ].map((plan) => {
      const members = users.filter((user) => String(user.plan || 'free').toLowerCase() === plan.key);
      return {
        ...plan,
        total: members.length,
        active: members.filter((user) => String(user.status || '').toLowerCase() === 'active').length,
        verified: members.filter((user) => Boolean(user.isVerified)).length,
      };
    });
    const premiumUsers = plans.filter((plan) => plan.key !== 'free').reduce((sum, plan) => sum + plan.total, 0);
    const activePremium = plans.filter((plan) => plan.key !== 'free').reduce((sum, plan) => sum + plan.active, 0);
    return { totalUsers: users.length, premiumUsers, activePremium, plans };
  }
  @Get('sales/trends')
  @Roles('sales', 'admin', 'super_admin')
  async salesTrends() {
    const payments = await this.paymentRepo.find({ order: { createdAt: 'ASC' } });
    const successful = payments.filter((payment) => payment.status === 'successful');
    const now = new Date();
    const monthKey = (date: Date) => date.toLocaleString('en-US', { month: 'short' });
    const weekOfMonth = (date: Date) => `W${Math.ceil(date.getDate() / 7)}`;
    const sameDay = (date: Date) => date.toDateString() === now.toDateString();
    const sameMonth = (date: Date) => date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    const monthly = Object.values(successful.reduce<Record<string, { m: string; sales: number; growth: number }>>((acc, payment) => {
      const key = monthKey(payment.createdAt);
      acc[key] ||= { m: key, sales: 0, growth: 0 };
      acc[key].sales += Number(payment.amount);
      return acc;
    }, {})).map((row, index, rows) => ({
      ...row,
      growth: index > 0 && rows[index - 1].sales > 0 ? Number((((row.sales - rows[index - 1].sales) / rows[index - 1].sales) * 100).toFixed(1)) : 0,
    }));

    const weekly = Object.values(successful.filter((payment) => sameMonth(payment.createdAt)).reduce<Record<string, { w: string; sales: number }>>((acc, payment) => {
      const key = weekOfMonth(payment.createdAt);
      acc[key] ||= { w: key, sales: 0 };
      acc[key].sales += Number(payment.amount);
      return acc;
    }, {}));

    const todaySales = successful.filter((payment) => sameDay(payment.createdAt)).reduce((sum, payment) => sum + Number(payment.amount), 0);
    const weekSales = successful.filter((payment) => sameMonth(payment.createdAt) && weekOfMonth(payment.createdAt) === weekOfMonth(now)).reduce((sum, payment) => sum + Number(payment.amount), 0);
    const monthSales = successful.filter((payment) => sameMonth(payment.createdAt)).reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      kpis: {
        todaySales,
        weekSales,
        monthSales,
        threeMonthGrowth: monthly.slice(-3).reduce((sum, row) => sum + row.growth, 0),
      },
      monthly,
      weekly,
    };
  }

  @Get('sales/plans')
  @Roles('sales', 'admin', 'super_admin')
  async salesPlans() {
    const plans = await this.planRepo.find({ order: { sortOrder: 'ASC' } });
    const users = await this.userRepo.find({ select: ['plan', 'city'] });
    return {
      plans: plans.map((plan) => {
        const details = this.normalizeSubscriptionPlan(plan);
        return {
          id: plan.id,
          key: plan.name,
          name: details.displayName,
          price: details.price,
          currency: details.currency,
          features: details.features,
          status: plan.status,
          subscribers: users.filter((u) => u.plan === plan.name).length,
        };
      }),
      topMarkets: Object.entries(users.reduce<Record<string, number>>((acc, user) => {
        const city = user.city || 'Unknown';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {})).map(([city, value]) => ({ city, value })).slice(0, 8),
    };
  }

  @Patch('payments/:id/refund')
  async refundPayment(@Param('id') id: string) {
    const payment = await this.paymentRepo.findOne({ where: { id }, relations: ['user'] });
    if (!payment) throw new NotFoundException('Payment not found.');
    payment.status = 'refunded';
    await this.paymentRepo.save(payment);
    await this.audit('Admin', 'Refund', `Refunded payment ${id}`);
    return payment;
  }

  @Get('logs')
  @Roles('super_admin')
  async logs() {
    const logs = await this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 250 });
    const now = Date.now();
    return {
      logs: logs.map((log) => ({
        id: log.id,
        user: log.user,
        activity: log.activity,
        ipAddress: log.ipAddress,
        action: log.action,
        module: log.module,
        role: log.role,
        device: log.device,
        loginAt: log.loginAt,
        lastActivityAt: log.lastActivityAt,
        logoutAt: log.logoutAt,
        durationSeconds: log.loginAt
          ? (log.durationSeconds ?? Math.max(0, Math.floor((now - new Date(log.loginAt).getTime()) / 1000)))
          : null,
        createdAt: log.createdAt,
      })),
    };
  }

  @Get('super-admin')
  @Roles('super_admin')
  async superAdmin() {
    const superAdmin = await this.userRepo.findOne({ where: { role: 'super_admin' } });
    if (!superAdmin) throw new NotFoundException('Super admin account not found. Run npm run db:setup in the backend.');
    const logs = await this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 5 });
    const ipWhitelist = [...new Set(logs.map((log) => log.ipAddress).filter(Boolean))];
    const modules = [
      { name: 'Dashboard', icon: 'LayoutDashboard', route: '/super-admin', access: true, actions: [{ label: 'View', allowed: true }] },
      { name: 'Users', icon: 'Users', route: '/super-admin/users', access: true, actions: [{ label: 'Manage', allowed: true }] },
      { name: 'Verification', icon: 'ShieldCheck', route: '/super-admin/verification', access: true, actions: [{ label: 'Review', allowed: true }] },
      { name: 'Payments', icon: 'CreditCard', route: '/super-admin/payments', access: true, actions: [{ label: 'Manage', allowed: true }] },
      { name: 'Transactions', icon: 'WalletCards', route: '/super-admin/transactions', access: true, actions: [{ label: 'View', allowed: true }] },
      { name: 'Reports', icon: 'Flag', route: '/super-admin/reports', access: true, actions: [{ label: 'Moderate', allowed: true }] },
      { name: 'Campaigns', icon: 'Bell', route: '/super-admin/notifications', access: true, actions: [{ label: 'Manage', allowed: true }] },
      { name: 'Security', icon: 'Lock', route: '/super-admin/security', access: true, actions: [{ label: 'Audit', allowed: true }] },
      { name: 'Settings', icon: 'Settings', route: '/super-admin/settings', access: true, actions: [{ label: 'Configure', allowed: true }] },
      { name: 'Roles & Permissions', icon: 'KeyRound', route: '/super-admin/roles', access: true, actions: [{ label: 'Manage', allowed: true }] },
      { name: 'System Logs', icon: 'ScrollText', route: '/super-admin/logs', access: true, actions: [{ label: 'View', allowed: true }] },
      { name: 'Super Admin Profile', icon: 'User', route: '/super-admin/super-admin', access: true, actions: [{ label: 'Update', allowed: true }] },
    ];

    return {
      superAdmin: {
        profile: {
          id: superAdmin.id,
          name: superAdmin.name,
          email: superAdmin.email,
          phone: '',
          role: 'Super Admin',
          status: superAdmin.status,
          initials: this.initials(superAdmin.name),
          joinedAt: superAdmin.createdAt.toISOString().split('T')[0],
          lastLogin: logs.find((log) => log.action.toLowerCase().includes('login'))?.createdAt?.toLocaleString() || '',
          lastActive: superAdmin.lastSeen?.toLocaleString() || '',
          twoFactorEnabled: false,
          ipWhitelist,
          timezone: 'Asia/Calcutta',
          sessionTimeout: '24 hours',
        },
        accessLevel: {
          level: 'Owner',
          totalPermissions: modules.reduce((count, module) => count + module.actions.filter((action) => action.allowed).length, 0),
          modulesAccessible: modules.filter((module) => module.access).length,
          description: 'Full platform access',
        },
        modules,
        activityLog: logs.map((log) => ({
          action: log.activity,
          time: log.createdAt.toLocaleString(),
          module: log.module,
        })),
      },
    };
  }
}
