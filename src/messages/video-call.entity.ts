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
/** 'match': free call between matched users. 'direct': paid call without a match. */
export type VideoCallMode = 'match' | 'direct';

@Entity('video_calls')
export class VideoCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  conversationId: string | null;

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

  @Column({ type: 'enum', enum: ['match', 'direct'], default: 'match' })
  mode: VideoCallMode;

  /** Direct call made on the caller's monthly free allowance (time-limited). */
  @Column({ type: 'boolean', default: false })
  isFreeTrial: boolean;

  /** Coins per started minute for a paid direct call. */
  @Column({ type: 'int', unsigned: true, nullable: true })
  ratePerMinute: number | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  billedMinutes: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  coinsCharged: number;

  /** false when the receiver was offline when the call started: it never rings for them. */
  @Column({ type: 'boolean', default: true })
  ringsReceiver: boolean;

  /** Why the server ended the call, e.g. 'free_limit' or 'coins_exhausted'. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  endReason: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  startedAt: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
