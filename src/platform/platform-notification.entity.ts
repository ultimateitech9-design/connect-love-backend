import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type NotificationStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'scheduled'
  | 'sent'
  | 'paused'
  | 'rejected'
  | 'expired';

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

  @Column({ type: 'varchar', length: 500, default: '' })
  description: string;

  @Column({ type: 'smallint', unsigned: true, nullable: true })
  discountPercent: number | null;

  @Column({ length: 80, default: 'View offer' })
  ctaLabel: string;

  @Column({ length: 255, default: '/user/premium' })
  ctaUrl: string;

  @Column({ length: 40, default: 'user_dashboard' })
  placement: string;

  @Column({ type: 'enum', enum: ['draft', 'pending_approval', 'active', 'scheduled', 'sent', 'paused', 'rejected', 'expired'], default: 'draft' })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdByUserId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  createdByRole: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  approvedByUserId: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  startsAt: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  endsAt: Date | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  impressions: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  clicks: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  dismissals: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
