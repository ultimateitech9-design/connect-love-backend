import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type PaymentStatus = 'successful' | 'pending' | 'refunded' | 'failed';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 120 })
  planName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'enum', enum: ['successful', 'pending', 'refunded', 'failed'], default: 'pending' })
  status: PaymentStatus;

  @Column({ length: 30, default: 'razorpay' })
  gateway: string;

  @Column({ length: 80, nullable: true, unique: true })
  gatewayOrderId: string;

  @Column({ length: 80, nullable: true, unique: true })
  gatewayPaymentId: string;

  @CreateDateColumn()
  createdAt: Date;
}
