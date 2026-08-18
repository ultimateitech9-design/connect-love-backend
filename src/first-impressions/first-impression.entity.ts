import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('first_impressions')
export class FirstImpression {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 36 })
  senderId: string;

  @Column({ length: 36 })
  receiverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'varchar', length: 36, nullable: true })
  replyMessageId: string | null;

  @Column({ type: 'datetime', nullable: true })
  repliedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
