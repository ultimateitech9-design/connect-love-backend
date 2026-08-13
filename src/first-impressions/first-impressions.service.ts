import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { FirstImpression } from './first-impression.entity';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { PlanUsageService } from '../plans/plan-usage.service';
import { MatchRelation, MatchStatus } from '../matches/match.entity';

@Injectable()
export class FirstImpressionsService {
  constructor(
    @InjectRepository(FirstImpression) private readonly impressions: Repository<FirstImpression>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(MatchRelation) private readonly matches: Repository<MatchRelation>,
    private readonly pushNotifications: PushNotificationsService,
    private readonly planUsage: PlanUsageService,
  ) {}

  async send(senderId: string, receiverId: string, rawContent: string) {
    const content = String(rawContent || '').trim();
    if (!receiverId || senderId === receiverId) throw new BadRequestException('Invalid profile.');
    if (!content) throw new BadRequestException('Write a message first.');
    if (content.length > 280) throw new BadRequestException('Message must be 280 characters or fewer.');
    if (!(await this.users.exist({ where: { id: receiverId, role: 'user' } }))) throw new NotFoundException('Profile not found.');
    if (await this.impressions.exist({ where: { senderId, receiverId } })) {
      throw new ConflictException('You have already sent this user a First Impression.');
    }

    const quota = await this.planUsage.assertAndRecord(senderId, 'firstImpressionsPerMonth', 'First Impression', receiverId);

    let saved: FirstImpression;
    try {
      saved = await this.impressions.save(this.impressions.create({ senderId, receiverId, content }));
    } catch (error: any) {
      if (error?.driverError?.code === 'ER_DUP_ENTRY' || error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('You have already sent this user a First Impression.');
      }
      throw error;
    }

    // A First Impression is also a normal profile like. This makes the profile
    // appear in Sent Likes for the sender and Likes Received for the receiver.
    // Do not replace or duplicate an existing relation between the same users.
    const relation = await this.matches.findOne({
      where: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });
    if (!relation) {
      await this.matches.save(this.matches.create({
        senderId,
        receiverId,
        status: MatchStatus.PENDING,
        isSuperLike: false,
      }));
    }

    void this.pushNotifications.sendToUser(receiverId, {
      title: 'New First Impression',
      body: 'Someone sent you a First Impression.',
      data: { type: 'first_impression', firstImpressionId: saved.id, url: '/user/messages' },
    }).catch(() => undefined);
    return { id: saved.id, createdAt: saved.createdAt, remainingToday: quota.remaining };
  }

  async received(userId: string) {
    const receiver = await this.users.findOne({ where: { id: userId }, select: ['id', 'plan', 'planExpiresAt'] });
    if (!receiver) throw new NotFoundException('User not found.');
    const unlocked = receiver.plan !== 'free' && (!receiver.planExpiresAt || receiver.planExpiresAt > new Date());
    const rows = await this.impressions.find({
      where: { receiverId: userId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      unlocked,
      items: rows.map((row) => ({
        id: row.id,
        sender: unlocked
          ? { id: row.sender.id, name: row.sender.name, photo: row.sender.photos?.[0] || null }
          : { id: null, name: 'Someone', photo: null },
        content: unlocked ? row.content : null,
        locked: !unlocked,
        isRead: row.isRead,
        createdAt: row.createdAt,
      })),
    };
  }
}
