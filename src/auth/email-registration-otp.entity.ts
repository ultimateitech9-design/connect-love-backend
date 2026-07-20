import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_registration_otps')
export class EmailRegistrationOtp {
  @PrimaryColumn({ length: 255 })
  email: string;

  @Column({ length: 64 })
  otpHash: string;

  @Column({ type: 'datetime', precision: 6 })
  expiresAt: Date;

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts: number;

  @Column({ type: 'datetime', precision: 6 })
  lastSentAt: Date;

  @Column({ type: 'datetime', precision: 6 })
  sendWindowStartedAt: Date;

  @Column({ type: 'int', unsigned: true, default: 1 })
  sendCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
