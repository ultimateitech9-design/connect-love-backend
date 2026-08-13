import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CouponPlan = 'all' | 'gold' | 'platinum';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 32, unique: true }) code: string;
  @Column({ type: 'int', unsigned: true }) discountPercent: number;
  @Column({ type: 'enum', enum: ['all', 'gold', 'platinum'], default: 'all' }) applicablePlan: CouponPlan;
  @Column({ type: 'datetime', nullable: true }) expiresAt: Date | null;
  @Column({ type: 'int', unsigned: true, nullable: true }) maxUses: number | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) usedCount: number;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
