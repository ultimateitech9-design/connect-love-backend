import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type CoinTransactionType = 'recharge' | 'gift' | 'theme' | 'withdrawal' | 'admin_credit';
export type CoinTransactionStatus = 'completed' | 'pending' | 'rejected';

@Entity('coin_transactions')
export class CoinTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 20 }) type: CoinTransactionType;
  @Column({ type: 'varchar', length: 20, default: 'completed' }) status: CoinTransactionStatus;
  @Column({ type: 'char', length: 36, nullable: true }) userId: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) senderId: string | null;
  @Column({ type: 'char', length: 36, nullable: true }) receiverId: string | null;
  @Column({ type: 'int', unsigned: true }) grossCoins: number;
  @Column({ type: 'int', unsigned: true, default: 0 }) userCoins: number;
  @Column({ type: 'int', unsigned: true, default: 0 }) platformCoins: number;
  @Column({ type: 'varchar', length: 120, nullable: true }) label: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) payoutAccount: string | null;
  @Column({ type: 'int', unsigned: true, nullable: true }) amountPaise: number | null;
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true }) gatewayOrderId: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true }) gatewayPaymentId: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true }) gatewayPayoutId: string | null;
  @CreateDateColumn() createdAt: Date;
}
