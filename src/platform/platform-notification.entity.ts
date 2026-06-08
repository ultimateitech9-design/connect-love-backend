import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type NotificationStatus = 'draft' | 'scheduled' | 'active' | 'sent' | 'paused';

@Entity('platform_notifications')
export class PlatformNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  campaign: string;

  @Column({ length: 40 })
  type: string;

  @Column({ length: 120 })
  audience: string;

  @Column({ type: 'enum', enum: ['draft', 'scheduled', 'active', 'sent', 'paused'], default: 'draft' })
  status: NotificationStatus;

  @CreateDateColumn()
  createdAt: Date;
}
