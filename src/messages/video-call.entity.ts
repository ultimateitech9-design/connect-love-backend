import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { MatchRelation } from '../matches/match.entity';

export type VideoCallStatus = 'ringing' | 'active' | 'ended' | 'rejected' | 'missed';
export type VideoCallType = 'audio' | 'video';

@Entity('video_calls')
export class VideoCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column()
  callerId: string;

  @Column()
  receiverId: string;

  @ManyToOne(() => MatchRelation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: MatchRelation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callerId' })
  caller: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column({ type: 'enum', enum: ['ringing', 'active', 'ended', 'rejected', 'missed'], default: 'ringing' })
  status: VideoCallStatus;

  @Column({ type: 'enum', enum: ['audio', 'video'], default: 'video' })
  callType: VideoCallType;

  @Column({ nullable: true, type: 'timestamp' })
  startedAt: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
