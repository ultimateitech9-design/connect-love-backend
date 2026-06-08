import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type UserPlan = 'free' | 'gold' | 'platinum';
export type UserRole = 'user' | 'admin' | 'super_admin' | 'marketing' | 'finance' | 'sales' | 'support';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending_verification';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false }) // Never returned in queries by default
  password: string;

  @Column({ nullable: true, type: 'date' })
  birthDate: Date;

  @Column({ nullable: true, length: 30 })
  gender: string;

  // Virtual getter for Age
  get age(): number | null {
    if (!this.birthDate) return null;
    const today = new Date();
    const birthDate = new Date(this.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // ─── Extended profile fields ──────────────────────────────────────────────

  @Column({ nullable: true, length: 150 })
  profession: string;

  @Column({ nullable: true, length: 20 })
  height: string;

  @Column({ nullable: true, length: 150 })
  city: string;

  @Column({ type: 'json', nullable: true })
  interests: string[];

  @Column({ type: 'json', nullable: true })
  personalityWords: string[];

  @Column({ nullable: true, length: 500 })
  bio: string;

  @Column({ type: 'json', nullable: true })
  photos: string[];

  // Virtual getter for backward compatibility
  get avatarUrl(): string | null {
    return this.photos && this.photos.length > 0 ? this.photos[0] : null;
  }

  @Column({ type: 'json', nullable: true })
  hobbies: string[];

  // ─── Subscription & status ────────────────────────────────────────────────

  @Column({ type: 'enum', enum: ['free', 'gold', 'platinum'], default: 'free' })
  plan: UserPlan;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'banned', 'pending_verification'], default: 'active' })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: ['user', 'admin', 'super_admin', 'marketing', 'finance', 'sales', 'support'],
    default: 'user',
  })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  onboardingCompleted: boolean;

  // ─── Settings & Presence ──────────────────────────────────────────────────

  @Column({ default: false })
  isOnline: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  lastSeen: Date;

  @Column({ default: true })
  showOnlineStatus: boolean;

  @Column({ default: true })
  showDistance: boolean;

  @Column({ default: false })
  photosVisibleToNonMatches: boolean;

  @Column({ default: false })
  onlyShowVerifiedProfiles: boolean;

  @Column({ default: true })
  notifyMessages: boolean;

  @Column({ default: true })
  notifyMatches: boolean;

  @Column({ default: true })
  notifyPush: boolean;

  @Column({ default: false })
  darkMode: boolean;

  @Column({ default: 'en', length: 10 })
  language: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
