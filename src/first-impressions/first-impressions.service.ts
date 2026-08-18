import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { FirstImpression } from './first-impression.entity';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { PlanUsageService } from '../plans/plan-usage.service';
import { MatchRelation, MatchStatus } from '../matches/match.entity';
import { Message } from '../messages/message.entity';
import { activePlan, isWoman } from '../plans/plan-entitlements';

@Injectable()
export class FirstImpressionsService {
  constructor(
    @InjectRepository(FirstImpression) private readonly impressions: Repository<FirstImpression>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(MatchRelation) private readonly matches: Repository<MatchRelation>,
    private readonly pushNotifications: PushNotificationsService,
    private readonly planUsage: PlanUsageService,
    private readonly dataSource: DataSource,
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
    const receiver = await this.users.findOne({ where: { id: userId }, select: ['id', 'gender', 'plan', 'planExpiresAt'] });
    if (!receiver) throw new NotFoundException('User not found.');
    // First Impressions are free to reveal for women. A paid plan still
    // reveals them for every other recipient.
    const unlocked = isWoman(receiver) || activePlan(receiver) !== 'free';
    const rows = await this.impressions.find({
      where: { receiverId: userId, replyMessageId: IsNull() },
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

  async reply(userId: string, impressionId: string, rawContent: string) {
    const content = String(rawContent || '').trim();
    if (!content) throw new BadRequestException('Write a reply first.');
    if (content.length > 2000) throw new BadRequestException('Reply must be 2000 characters or fewer.');

    const result = await this.dataSource.transaction(async (manager) => {
      const impressions = manager.getRepository(FirstImpression);
      const impression = await impressions.findOne({
        where: { id: impressionId },
        relations: ['receiver'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!impression) throw new NotFoundException('First Impression not found.');
      if (impression.receiverId !== userId) throw new ForbiddenException('You cannot reply to this First Impression.');

      const canReply = isWoman(impression.receiver) || activePlan(impression.receiver) !== 'free';
      if (!canReply) {
        throw new ForbiddenException('Upgrade to an active paid plan to read and reply to First Impressions.');
      }
      if (impression.replyMessageId) throw new ConflictException('You have already replied to this First Impression.');

      const matches = manager.getRepository(MatchRelation);
      const relation = await matches.findOne({
        where: [
          { senderId: impression.senderId, receiverId: impression.receiverId },
          { senderId: impression.receiverId, receiverId: impression.senderId },
        ],
        lock: { mode: 'pessimistic_write' },
      });
      if (!relation) throw new NotFoundException('Conversation could not be created.');
      if (relation.status === MatchStatus.BLOCKED) throw new ForbiddenException('This conversation is blocked.');

      relation.status = MatchStatus.MATCHED;
      relation.hiddenFromChatForUserIds = null;
      await matches.save(relation);

      const messageRepo = manager.getRepository(Message);
      const message = await messageRepo.save(messageRepo.create({
        conversationId: relation.id,
        senderId: userId,
        receiverId: impression.senderId,
        content,
        reactions: null,
        deletedForUserIds: null,
        deletedForEveryone: false,
        pinnedByUserIds: null,
        starredByUserIds: null,
        replyToMessageId: null,
        isRead: false,
        editedAt: null,
      }));

      impression.replyMessageId = message.id;
      impression.repliedAt = new Date();
      impression.isRead = true;
      await impressions.save(impression);
      return { matchId: relation.id, message };
    });

    void this.pushNotifications.sendToUser(result.message.receiverId, {
      title: 'First Impression reply',
      body: 'You received a reply to your First Impression.',
      data: { type: 'first_impression_reply', conversationId: result.matchId, url: '/user/messages?id=' + result.matchId },
    }).catch(() => undefined);

    return { success: true, matchId: result.matchId, message: result.message };
  }
}
