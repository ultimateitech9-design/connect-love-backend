import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PayoutOwnerType = 'user' | 'agent';
export type PayoutMethod = 'bank' | 'upi';

/** A saved bank account or UPI ID used for withdrawals. */
@Entity('payout_accounts')
@Index('IDX_payout_accounts_owner', ['ownerType', 'ownerId'])
export class PayoutAccount {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: ['user', 'agent'] }) ownerType: PayoutOwnerType;
  @Column({ type: 'char', length: 36 }) ownerId: string;
  @Column({ type: 'enum', enum: ['bank', 'upi'] }) method: PayoutMethod;
  @Column({ type: 'varchar', length: 120, nullable: true }) accountHolder: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) bankName: string | null;
  @Column({ type: 'varchar', length: 11, nullable: true }) ifsc: string | null;
  /** AES-256-GCM encrypted; never returned to clients. */
  @Column({ type: 'text', nullable: true, select: false }) accountNumberEncrypted: string | null;
  @Column({ type: 'varchar', length: 4, nullable: true }) accountNumberLast4: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) upiId: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
