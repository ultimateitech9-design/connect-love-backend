import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
export type VerificationPriority = 'low' | 'normal' | 'high';

@Entity('verification_requests')
export class VerificationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 80, default: 'Government ID' })
  idType: string;

  @Column({ type: 'enum', enum: ['low', 'normal', 'high'], default: 'normal' })
  priority: VerificationPriority;

  @Column({ type: 'enum', enum: ['pending', 'under_review', 'approved', 'rejected'], default: 'pending' })
  status: VerificationStatus;

  @Column({ type: 'json', nullable: true })
  documents: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
