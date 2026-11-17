import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EmailChallengePurpose = 'change_old' | 'change_new' | 'secondary_add' | 'secondary_remove' | 'recovery';

@Entity('user_email_challenges')
@Index(['userId', 'purpose'], { unique: true })
export class UserEmailChallenge {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 36 }) userId: string;
  @Column({ type: 'varchar', length: 32 }) purpose: EmailChallengePurpose;
  @Column({ length: 255 }) email: string;
  @Column({ length: 64 }) otpHash: string;
  @Column({ type: 'datetime', precision: 6 }) expiresAt: Date;
  @Column({ type: 'datetime', nullable: true }) verifiedAt: Date | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) attempts: number;
  @Column({ type: 'datetime', precision: 6 }) lastSentAt: Date;
  @Column({ type: 'datetime', precision: 6 }) sendWindowStartedAt: Date;
  @Column({ type: 'int', unsigned: true, default: 1 }) sendCount: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
