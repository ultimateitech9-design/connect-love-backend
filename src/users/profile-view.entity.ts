import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('profile_views')
@Index('IDX_profile_views_profile_created', ['profileUserId', 'createdAt'])
@Index('IDX_profile_views_viewer_created', ['viewerUserId', 'createdAt'])
export class ProfileView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  profileUserId: string;

  @Column()
  viewerUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
