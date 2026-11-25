import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('referral_codes')
export class ReferralCode {
  @PrimaryColumn({ type: 'varchar', length: 36 }) userId: string;
  @Column({ type: 'varchar', length: 24, unique: true }) code: string;
}

@Entity('referrals')
@Index('IDX_referral_inviter', ['referrerId'])
export class Referral {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 36 }) referrerId: string;
  @Column({ type: 'varchar', length: 36, unique: true }) referredId: string;
  @Column({ type: 'datetime', nullable: true }) qualifiedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity('referral_activity')
export class ReferralActivity {
  @PrimaryColumn({ type: 'varchar', length: 36 }) referralId: string;
  @PrimaryColumn({ type: 'varchar', length: 10 }) activeDate: string;
}

@Entity('referral_rewards')
@Index('UQ_referral_reward', ['referralId', 'userId', 'kind'], { unique: true })
@Index('IDX_referral_wallet', ['userId', 'withdrawalId', 'unlockAt'])
export class ReferralReward {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 36 }) referralId: string;
  @Column({ type: 'varchar', length: 36 }) userId: string;
  @Column({ type: 'varchar', length: 16 }) kind: 'invitation' | 'welcome' | 'activity_bonus';
  @Column({ type: 'int', unsigned: true }) amountPaise: number;
  @Column({ type: 'datetime' }) unlockAt: Date;
  @Column({ type: 'varchar', length: 36, nullable: true }) withdrawalId: string | null;
  @CreateDateColumn() createdAt: Date;
}
