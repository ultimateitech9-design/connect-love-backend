import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type DevicePlatform = 'android' | 'ios' | 'web' | 'unknown';

@Entity('user_devices')
@Index('IDX_user_devices_user_active', ['userId', 'isActive'])
@Index('IDX_user_devices_user_device', ['userId', 'deviceId'])
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'varchar',
    length: 512,
    unique: true,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  token: string;

  @Column({ type: 'varchar', length: 20, default: 'unknown' })
  platform: DevicePlatform;

  @Column({ type: 'varchar', length: 191, nullable: true })
  deviceId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  appVersion: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'datetime', precision: 6 })
  lastSeenAt: Date;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;
}
