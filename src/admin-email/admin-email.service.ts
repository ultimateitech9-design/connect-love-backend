import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { isEmail } from 'class-validator';
import * as nodemailer from 'nodemailer';
import sharp from 'sharp';
import { User } from '../users/user.entity';
import { AuditLog } from '../platform/audit-log.entity';
import { renderEmail } from '../mail/email-layout';
import { AdminEmailCampaign, AdminEmailRecipient } from './admin-email.entity';
import { EmailAudienceDto, EmailRecipientsQueryDto, FailedEmailsQueryDto, SendAdminEmailDto } from './admin-email.dto';

const GENDERS = {
  female: ['female', 'woman', 'women', 'girl', 'ladies', 'f'],
  male: ['male', 'man', 'men', 'boy', 'gentleman', 'm'],
};

@Injectable()
export class AdminEmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminEmailService.name);
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private stopping = false;
  private queueFailures = 0;
  private nextQueueAttemptAt = 0;
  private queueReady = false;
  private transport?: nodemailer.Transporter;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AdminEmailCampaign) private readonly jobs: Repository<AdminEmailCampaign>,
    @InjectRepository(AdminEmailRecipient) private readonly deliveries: Repository<AdminEmailRecipient>,
    private readonly db: DataSource,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => { void this.runQueueCycle(); }, 2000);
    this.timer.unref();
  }

  private async runQueueCycle() {
    if (this.busy || this.stopping || !this.smtpConfigured() || Date.now() < this.nextQueueAttemptAt) return;
    try {
      await this.processQueue();
      if (!this.queueReady || this.queueFailures > 0) {
        this.logger.log(this.queueFailures > 0 ? 'Email queue recovered and is ready.' : 'Email queue ready.');
        this.queueReady = true;
      }
      this.queueFailures = 0;
      this.nextQueueAttemptAt = 0;
    } catch (error: any) {
      const rawCode = error?.driverError?.code || error?.code;
      const code = typeof rawCode === 'string' && /^[A-Z0-9_]{1,48}$/.test(rawCode) ? rawCode : 'UNKNOWN';
      const retryMs = Math.min(60000, 2000 * 2 ** Math.min(++this.queueFailures, 5));
      this.nextQueueAttemptAt = Date.now() + retryMs;
      const hint = ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(code) ? ' Apply pending database migrations.' : '';
      const table = String(error?.driverError?.sqlMessage || error?.sqlMessage || '')
        .match(/Table '[^']*\.(admin_email_campaigns|admin_email_recipients)' doesn't exist/i)?.[1];
      // Error codes are useful without exposing SQL, recipients or SMTP credentials.
      this.logger.error(`Email queue processing failed (${code}${table ? `: ${table}` : ''}).${hint} Retrying in ${retryMs / 1000}s.`);
    }
  }

  onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.transport?.close();
  }

  private audience(query: EmailAudienceDto) {
    const qb = this.users.createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.gender'])
      .where('u.role = :role', { role: 'user' })
      .andWhere("u.email IS NOT NULL AND TRIM(u.email) <> ''");
    if (query.audience === 'inactive') {
      // Never-seen members become inactive seven days after registration.
      // updatedAt also changes on admin edits, so it is not an activity signal.
      qb.andWhere('u.isOnline = :online', { online: false })
        .andWhere('COALESCE(u.lastSeen, u.createdAt) <= :inactiveBefore', {
          inactiveBefore: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        });
    } else if (query.audience && query.audience !== 'all') {
      qb.andWhere('LOWER(TRIM(u.gender)) IN (:...genders)', { genders: GENDERS[query.audience] });
    }
    if (query.search?.trim()) {
      // Search is literal: % and _ must not broaden the selected audience.
      qb.andWhere("(LOCATE(:search, u.name) > 0 OR LOCATE(:search, u.email) > 0)", { search: query.search.trim() });
    }
    return qb;
  }

  async recipients(query: EmailRecipientsQueryDto) {
    const page = query.page || 1;
    const [users, total] = await this.audience(query).orderBy('u.email', 'ASC').addOrderBy('u.id', 'ASC')
      .skip((page - 1) * 50).take(50).getManyAndCount();
    return { users, total, page, limit: 50, smtpConfigured: this.smtpConfigured() };
  }

  async failures(query: FailedEmailsQueryDto) {
    const page = query.page || 1;
    // Keep the original recipient email/name even if the member is edited or deleted.
    const qb = this.deliveries.createQueryBuilder('r')
      .leftJoin(User, 'u', 'u.id = r.userId')
      .leftJoin(AdminEmailCampaign, 'c', 'c.id = r.campaignId')
      .where('r.status = :status', { status: 'failed' });
    if (query.gender && query.gender !== 'all') {
      qb.andWhere('LOWER(TRIM(u.gender)) IN (:...genders)', { genders: GENDERS[query.gender] });
    }
    if (query.search?.trim()) {
      qb.andWhere('(LOCATE(:search, r.name) > 0 OR LOCATE(:search, r.email) > 0 OR LOCATE(:search, c.subject) > 0)', { search: query.search.trim() });
    }
    const total = await qb.getCount();
    const failures = await qb.select('r.id', 'id').addSelect('r.userId', 'userId')
      .addSelect('r.name', 'name').addSelect('r.email', 'email').addSelect('u.gender', 'gender')
      .addSelect('r.campaignId', 'campaignId').addSelect('c.subject', 'subject')
      .addSelect('r.error', 'error').addSelect('r.attemptedAt', 'attemptedAt').addSelect('r.createdAt', 'createdAt')
      .orderBy('r.createdAt', 'DESC').addOrderBy('r.id', 'DESC')
      .offset((page - 1) * 50).limit(50).getRawMany();
    return { failures, total, page, limit: 50 };
  }

  private smtpConfigured() {
    return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD);
  }

  private mailer() {
    if (!this.smtpConfigured()) throw new ServiceUnavailableException('Email delivery is not configured. Please configure SMTP first.');
    if (!this.transport) {
      const port = Number(process.env.SMTP_PORT || 465);
      this.transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST!.trim(), port,
        secure: (process.env.SMTP_SECURE || String(port === 465)).toLowerCase() === 'true',
        auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASSWORD },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
      });
    }
    return this.transport;
  }

  private async image(dataUrl?: string): Promise<string | null> {
    if (!dataUrl) return null;
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match) throw new BadRequestException('Choose a JPEG, PNG or WebP photo.');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 3 * 1024 * 1024) throw new BadRequestException('Photo must be 3 MB or smaller.');
    try {
      return (await sharp(buffer, { limitInputPixels: 25000000 }).rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 }).toBuffer()).toString('base64');
    } catch { throw new BadRequestException('This photo could not be read. Choose another image.'); }
  }

  async enqueue(dto: SendAdminEmailDto, createdBy: string) {
    const existing = await this.jobs.findOneBy({ createdBy, requestId: dto.requestId });
    if (existing) return this.campaign(existing.id);
    this.mailer();
    if (/[\r\n]/.test(dto.subject)) throw new BadRequestException('Subject must be a single line.');
    if (!dto.selectAll && !dto.userIds?.length) throw new BadRequestException('Select at least one user.');
    const qb = this.audience(dto);
    if (!dto.selectAll) qb.andWhere('u.id IN (:...ids)', { ids: dto.userIds });
    if (dto.selectAll && dto.excludedUserIds?.length) qb.andWhere('u.id NOT IN (:...excluded)', { excluded: dto.excludedUserIds });
    const users = await qb.getMany();
    if (!dto.selectAll && users.length !== dto.userIds.length) throw new BadRequestException('Some selected users are no longer available. Refresh the list.');
    if (users.some(user => !isEmail(user.email.trim()))) throw new BadRequestException('The selection includes an invalid email address. Exclude that user and try again.');
    const unique = [...new Map(users.map(user => [user.email.trim().toLowerCase(), user])).values()];
    if (!unique.length) throw new BadRequestException('No users match your selection.');
    const imageBase64 = await this.image(dto.imageDataUrl);
    const id = randomUUID();
    try {
      await this.db.transaction(async manager => {
        await manager.getRepository(AdminEmailCampaign).insert({
          id, createdBy, requestId: dto.requestId, subject: dto.subject, message: dto.message,
          audience: dto.audience || 'all', total: unique.length, imageBase64,
        });
        for (let offset = 0; offset < unique.length; offset += 500) {
          await manager.getRepository(AdminEmailRecipient).insert(unique.slice(offset, offset + 500).map(user => ({
            id: randomUUID(), campaignId: id, userId: user.id, email: user.email.trim().toLowerCase(), name: user.name, status: 'pending' as const,
          })));
        }
        await manager.getRepository(AuditLog).insert({ userId: createdBy, user: 'Super Admin',
          activity: `Queued email to ${unique.length} users: ${dto.subject}`.slice(0, 255),
          action: 'Queued', module: 'Email Send', role: 'super_admin' });
      });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        const duplicate = await this.jobs.findOneBy({ createdBy, requestId: dto.requestId });
        if (duplicate) return this.campaign(duplicate.id);
      }
      throw error;
    }
    return this.campaign(id);
  }

  async campaigns() {
    const jobs = await this.jobs.find({ order: { createdAt: 'DESC' }, take: 20 });
    if (!jobs.length) return { campaigns: [] };
    const counts = await this.deliveries.createQueryBuilder('r').select('r.campaignId', 'campaignId')
      .addSelect('r.status', 'status').addSelect('COUNT(*)', 'count')
      .where('r.campaignId IN (:...ids)', { ids: jobs.map(job => job.id) })
      .groupBy('r.campaignId').addGroupBy('r.status').getRawMany();
    return { campaigns: jobs.map(job => this.summary(job, counts.filter(row => row.campaignId === job.id))) };
  }

  private summary(job: AdminEmailCampaign, counts: { status: string; count: string }[]) {
    const count = (status: string) => Number(counts.find(row => row.status === status)?.count || 0);
    const pending = count('pending') + count('sending');
    // The SMTP server's acceptance is reported as sent; inbox placement cannot be guaranteed.
    return { id: job.id, subject: job.subject, audience: job.audience, total: job.total,
      sent: count('sent'), failed: count('failed'), pending, status: pending ? 'sending' : 'completed', createdAt: job.createdAt };
  }

  async campaign(id: string) {
    const job = await this.jobs.findOneBy({ id });
    if (!job) throw new NotFoundException('Email campaign not found.');
    const counts = await this.deliveries.createQueryBuilder('r').select('r.status', 'status').addSelect('COUNT(*)', 'count')
      .where('r.campaignId = :id', { id }).groupBy('r.status').getRawMany();
    const failures = await this.deliveries.find({ where: { campaignId: id, status: 'failed' }, select: ['email', 'error'], take: 20 });
    return { ...this.summary(job, counts), failures };
  }

  async processQueue() {
    if (this.busy || this.stopping || !this.smtpConfigured()) return;
    this.busy = true;
    try {
      // A crash after SMTP accepted an email leaves its delivery uncertain. Never
      // automatically resend such records, which could send duplicate emails.
      await this.deliveries.createQueryBuilder().update().set({ status: 'failed', error: 'Delivery uncertain after interruption. Check before resending.' })
        .where("status = 'sending' AND attemptedAt < :before", { before: new Date(Date.now() - 10 * 60 * 1000) }).execute();
      const pending = await this.deliveries.find({ where: { status: 'pending' }, order: { createdAt: 'ASC', id: 'ASC' }, take: 3 });
      const jobs = pending.length ? await this.jobs.createQueryBuilder('c').addSelect('c.imageBase64')
        .where({ id: In([...new Set(pending.map(row => row.campaignId))]) }).getMany() : [];
      for (const recipient of pending) {
        if (this.stopping) break;
        const claimed = await this.deliveries.update({ id: recipient.id, status: 'pending' }, { status: 'sending', attemptedAt: new Date() });
        if (!claimed.affected) continue;
        const job = jobs.find(row => row.id === recipient.campaignId);
        let status: 'sent' | 'failed' = 'failed';
        let error: string | null = null;
        try {
          if (!job) throw new Error('Missing email campaign.');
          const content = renderEmail({ title: job.subject, preheader: job.message.slice(0, 120),
            greeting: `Hi ${recipient.name},`, paragraphs: job.message.split(/\r?\n/),
            image: job.imageBase64 ? { src: 'cid:campaign-photo', alt: 'Photo from Connect Love' } : undefined });
          const result = await this.mailer().sendMail({
            from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim(), to: recipient.email,
            subject: job.subject, ...content,
            attachments: job.imageBase64 ? [{ filename: 'connect-love-photo.jpg', content: Buffer.from(job.imageBase64, 'base64'), contentType: 'image/jpeg', cid: 'campaign-photo' }] : [],
          });
          if (result.rejected?.length) throw new Error('Recipient rejected.');
          status = 'sent';
        } catch {
          error = 'Email was not confirmed by the mail server. Check SMTP settings and recipient address.';
        }
        // Keep persistence errors separate from SMTP errors: an accepted email
        // must remain uncertain if its result cannot be saved, never retried.
        await this.deliveries.update({ id: recipient.id }, { status, error });
      }
    } finally { this.busy = false; }
  }
}
