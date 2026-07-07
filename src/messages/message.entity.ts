import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column()
  senderId: string;

  @Column()
  receiverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column('mediumtext')
  content: string;

  @Column({ type: 'text', nullable: true })
  reactions: string | null;

  @Column({ type: 'text', nullable: true })
  deletedForUserIds: string | null;

  @Column({ default: false })
  deletedForEveryone: boolean;

  @Column({ type: 'text', nullable: true })
  pinnedByUserIds: string | null;

  @Column({ type: 'text', nullable: true })
  starredByUserIds: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  replyToMessageId: string | null;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  editedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
