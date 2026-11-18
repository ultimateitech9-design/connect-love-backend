import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 'all' = every subscription plan; 'coins' = wallet coin recharges only. */
export type CouponPlan = 'all' | 'gold' | 'platinum' | 'coins';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 32, unique: true }) code: string;
  @Column({ type: 'int', unsigned: true }) discountPercent: number;
  @Column({ type: 'enum', enum: ['all', 'gold', 'platinum', 'coins'], default: 'all' }) applicablePlan: CouponPlan;
  @Column({ type: 'datetime', nullable: true }) expiresAt: Date | null;
  @Column({ type: 'int', unsigned: true, nullable: true }) maxUses: number | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) usedCount: number;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
