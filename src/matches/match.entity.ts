import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum MatchStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  DECLINED = 'DECLINED',
  BLOCKED = 'BLOCKED',
}

@Entity('matches')
export class MatchRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @Column({ default: false })
  isSuperLike: boolean;

  // Members who cleared this chat; this only hides the conversation for them.
  @Column({ type: 'text', nullable: true })
  hiddenFromChatForUserIds: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
