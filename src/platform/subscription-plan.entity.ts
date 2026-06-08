import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanStatus = 'active' | 'inactive';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 120 })
  name: string;

  @Column({ length: 120 })
  displayName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'json', nullable: true })
  features: string[];

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: PlanStatus;

  @Column({ default: 0 })
  sortOrder: number;
}
