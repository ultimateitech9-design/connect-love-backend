import { Column, CreateDateColumn, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_emails')
@Index(['userId', 'isPrimary'])
export class UserEmail {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 255, unique: true }) email: string;
  @Column({ type: 'varchar', length: 36 }) userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user: User;
  @Column({ default: false }) isPrimary: boolean;
  @Column({ nullable: true, type: 'datetime' }) verifiedAt: Date | null;
  // Secondary addresses deliberately cannot be used as login identities.
  @Column({ default: false }) loginEnabled: boolean;
  @CreateDateColumn() createdAt: Date;
}
