import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 150 }) name: string;
  @Column({ unique: true, length: 255 }) email: string;
  @Column({ select: false }) password: string;
  @Column({ default: 0 }) sessionVersion: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('agent_email_challenges')
@Index('UQ_agent_challenge', ['email', 'purpose'], { unique: true })
export class AgentEmailChallenge {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 255 }) email: string;
  @Column({ length: 16 }) purpose: string;
  @Column({ length: 64 }) codeHash: string;
  @Column({ type: 'datetime' }) expiresAt: Date;
  @Column({ type: 'datetime' }) sentAt: Date;
  @Column({ default: 0 }) attempts: number;
  @Column({ default: 1 }) sends: number;
  @Column({ type: 'datetime' }) windowStartedAt: Date;
}
