import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 40, nullable: true })
  phone?: string;

  @Column({ name: 'photo_data_url', type: 'longtext', nullable: true })
  photoDataUrl?: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'open', length: 30 })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
