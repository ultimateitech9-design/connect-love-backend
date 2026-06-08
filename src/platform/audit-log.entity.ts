import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ length: 150 })
  user: string;

  @Column({ length: 255 })
  activity: string;

  @Column({ length: 80, default: '127.0.0.1' })
  ipAddress: string;

  @Column({ length: 80 })
  action: string;

  @Column({ length: 80 })
  module: string;

  @CreateDateColumn()
  createdAt: Date;
}
