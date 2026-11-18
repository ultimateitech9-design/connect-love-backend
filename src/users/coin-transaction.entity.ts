import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type CoinTransactionType = 'recharge' | 'gift' | 'theme' | 'withdrawal' | 'admin_credit' | 'call';
export type CoinTransactionStatus = 'completed' | 'pending' | 'rejected';

@Entity('coin_transactions')
export class CoinTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 20 }) type: CoinTransactionType;
  @Column({ type: 'varchar', length: 20, default: 'completed' }) status: CoinTransactionStatus;
  @Column({ type: 'char', length: 36, nullable: true }) userId: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) senderId: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) receiverId: string | null;
  /** Agent who created the receiver's account and earned a share (direct calls). */
  @Column({ type: 'char', length: 36, nullable: true }) agentId: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) callId: string | null;
  @Column({ type: 'int', unsigned: true }) grossCoins: number;
  @Column({ type: 'int', unsigned: true, default: 0 }) userCoins: number;
  @Column({ type: 'int', unsigned: true, default: 0 }) platformCoins: number;
  @Column({ type: 'int', unsigned: true, default: 0 }) agentCoins: number;
  @Column({ type: 'varchar', length: 120, nullable: true }) label: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) payoutAccount: string | null;
  @Column({ type: 'text', nullable: true }) payoutDetails: string | null;
  @Column({ type: 'int', unsigned: true, nullable: true }) amountPaise: number | null;
  /** Recharge coupon: amountPaise is what was paid after discountPaise. */
  @Column({ type: 'varchar', length: 32, nullable: true }) couponCode: string | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) discountPaise: number;
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true }) gatewayOrderId: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true }) gatewayPaymentId: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true }) gatewayPayoutId: string | null;
  @CreateDateColumn() createdAt: Date;
}
