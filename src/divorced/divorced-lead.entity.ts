import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('divorced_dating_leads')
export class DivorcedLead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  relationshipGoal: string;

  @Column({ length: 20 })
  ageRange: string;

  @Column({ length: 120 })
  city: string;

  @Column({ length: 40 })
  childrenPreference: string;

  @CreateDateColumn()
  createdAt: Date;
}
