import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plan_usage')
@Index(['userId', 'action', 'createdAt'])
export class PlanUsage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column({ length: 40 }) action: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) targetId: string | null;
  @CreateDateColumn() createdAt: Date;
}
