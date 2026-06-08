import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'open', length: 30 })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
