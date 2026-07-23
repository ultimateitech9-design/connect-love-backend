import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { applicationDefault, cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { Not, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UnregisterDeviceDto } from './dto/unregister-device.dto';
import { UserDevice } from './user-device.entity';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
}

export interface PushDeliveryResult {
  configured: boolean;
  attempted: number;
  delivered: number;
  failed: number;
  deactivated: number;
}

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name);
  private firebaseApp: App | null = null;

  constructor(
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  onModuleInit(): void {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (getApps().length > 0) {
        this.firebaseApp = getApps()[0];
        return;
      }

      const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
      const useApplicationDefault = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

      if (projectId && clientEmail && privateKey) {
        this.firebaseApp = initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        });
      } else if (useApplicationDefault) {
        this.firebaseApp = initializeApp({
          credential: applicationDefault(),
          ...(projectId ? { projectId } : {}),
        });
      } else {
        this.logger.warn(
          'Firebase credentials are not configured. Device registration works, but push delivery is disabled.',
        );
      }
    } catch (error) {
      this.firebaseApp = null;
      this.logger.error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.firebaseApp);
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const token = dto.token.trim();
    const deviceId = dto.deviceId?.trim() || null;
    const now = new Date();

    let device = await this.deviceRepo.findOne({ where: { token } });
    if (!device) {
      device = this.deviceRepo.create({ token, userId });
    }

    device.userId = userId;
    device.platform = dto.platform;
    device.deviceId = deviceId;
    device.deviceName = dto.deviceName?.trim() || null;
    device.appVersion = dto.appVersion?.trim() || null;
    device.isActive = true;
    device.lastSeenAt = now;
    device = await this.deviceRepo.save(device);

    if (deviceId) {
      await this.deviceRepo.update(
        { userId, deviceId, id: Not(device.id), isActive: true },
        { isActive: false },
      );
    }

    return this.publicDevice(device);
  }

  async listDevices(userId: string) {
    const devices = await this.deviceRepo.find({
      where: { userId },
      order: { lastSeenAt: 'DESC' },
    });
    return devices.map((device) => this.publicDevice(device));
  }

  async unregisterDevice(userId: string, dto: UnregisterDeviceDto) {
    const token = dto.token?.trim();
    const deviceId = dto.deviceId?.trim();
    if (!token && !deviceId) {
      throw new BadRequestException('token or deviceId is required.');
    }

    const result = token
      ? await this.deviceRepo.update({ userId, token, isActive: true }, { isActive: false })
      : await this.deviceRepo.update({ userId, deviceId, isActive: true }, { isActive: false });

    return { unregistered: result.affected || 0 };
  }

  async unregisterAllDevices(userId: string) {
    const result = await this.deviceRepo.update({ userId, isActive: true }, { isActive: false });
    return { unregistered: result.affected || 0 };
  }

  async sendToUser(userId: string, message: PushMessage): Promise<PushDeliveryResult> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'notifyPush'],
    });
    if (!user?.notifyPush) return this.emptyDeliveryResult();

    const devices = await this.deviceRepo.find({ where: { userId, isActive: true } });
    return this.sendToDevices(devices, message);
  }

  async sendToUsers(userIds: string[], message: PushMessage): Promise<PushDeliveryResult> {
    if (userIds.length === 0) return this.emptyDeliveryResult();
    const devices = await this.deviceRepo
      .createQueryBuilder('device')
      .innerJoin(User, 'user', 'user.id = device.userId AND user.notifyPush = :notifyPush', { notifyPush: true })
      .where('device.userId IN (:...userIds)', { userIds: [...new Set(userIds)] })
      .andWhere('device.isActive = :isActive', { isActive: true })
      .getMany();
    return this.sendToDevices(devices, message);
  }

  private async sendToDevices(devices: UserDevice[], message: PushMessage): Promise<PushDeliveryResult> {
    if (!this.firebaseApp || devices.length === 0) {
      return { ...this.emptyDeliveryResult(), configured: Boolean(this.firebaseApp) };
    }

    const result: PushDeliveryResult = {
      configured: true,
      attempted: devices.length,
      delivered: 0,
      failed: 0,
      deactivated: 0,
    };
    const data = Object.fromEntries(
      Object.entries(message.data || {})
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    );

    for (let offset = 0; offset < devices.length; offset += 500) {
      const batch = devices.slice(offset, offset + 500);
      const payload: MulticastMessage = {
        tokens: batch.map((device) => device.token),
        notification: { title: message.title, body: message.body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      };
      const response = await getMessaging(this.firebaseApp).sendEachForMulticast(payload);
      result.delivered += response.successCount;
      result.failed += response.failureCount;

      const invalidDeviceIds = response.responses
        .map((item, index) => ({ item, deviceId: batch[index].id }))
        .filter(({ item }) => {
          const code = item.error?.code;
          return code === 'messaging/registration-token-not-registered'
            || code === 'messaging/invalid-registration-token';
        })
        .map(({ deviceId }) => deviceId);

      if (invalidDeviceIds.length > 0) {
        await this.deviceRepo
          .createQueryBuilder()
          .update(UserDevice)
          .set({ isActive: false })
          .whereInIds(invalidDeviceIds)
          .execute();
        result.deactivated += invalidDeviceIds.length;
      }
    }

    return result;
  }

  private emptyDeliveryResult(): PushDeliveryResult {
    return {
      configured: Boolean(this.firebaseApp),
      attempted: 0,
      delivered: 0,
      failed: 0,
      deactivated: 0,
    };
  }

  private publicDevice(device: UserDevice) {
    return {
      id: device.id,
      platform: device.platform,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      appVersion: device.appVersion,
      isActive: device.isActive,
      tokenPreview: `${device.token.slice(0, 8)}…${device.token.slice(-6)}`,
      lastSeenAt: device.lastSeenAt,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
