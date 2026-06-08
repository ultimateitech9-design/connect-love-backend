import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('platform_roles')
export class PlatformRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 120 })
  role: string;

  @Column({ default: 0 })
  permissions: number;

  @Column({ length: 30, default: 'Active' })
  status: string;
}
