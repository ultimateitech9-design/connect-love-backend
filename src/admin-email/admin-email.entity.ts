import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admin_email_campaigns')
@Index('UQ_admin_email_request', ['createdBy', 'requestId'], { unique: true })
export class AdminEmailCampaign {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 36 }) createdBy: string;
  @Column({ length: 36 }) requestId: string;
  @Column({ length: 200 }) subject: string;
  @Column({ type: 'text' }) message: string;
  @Column({ length: 10 }) audience: string;
  @Column({ type: 'int', unsigned: true }) total: number;
  @Column({ type: 'mediumtext', nullable: true, select: false }) imageBase64: string | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity('admin_email_recipients')
@Index('UQ_admin_email_recipient', ['campaignId', 'email'], { unique: true })
@Index('IDX_admin_email_queue', ['status', 'createdAt'])
export class AdminEmailRecipient {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 36 }) campaignId: string;
  @Column({ length: 36 }) userId: string;
  @Column({ length: 255 }) email: string;
  @Column({ length: 150 }) name: string;
  @Column({ length: 10, default: 'pending' }) status: 'pending' | 'sending' | 'sent' | 'failed';
  @Column({ type: 'varchar', length: 255, nullable: true }) error: string | null;
  @Column({ type: 'datetime', nullable: true }) attemptedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
