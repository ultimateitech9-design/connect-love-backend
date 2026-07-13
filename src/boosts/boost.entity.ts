import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type BoostPlanKey = '30_minutes' | '1_hour' | '3_hours' | '24_hours';

@Entity('profile_boosts')
@Index('IDX_profile_boosts_user_ends', ['userId', 'endsAt'])
@Index('UQ_profile_boosts_user_request', ['userId', 'requestId'], { unique: true })
export class ProfileBoost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 36 })
  requestId: string;

  @Column({ type: 'varchar', length: 30 })
  planKey: BoostPlanKey;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ type: 'datetime' })
  endsAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
