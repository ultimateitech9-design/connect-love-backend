import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryColumn({ length: 120 })
  key: string;

  @Column({ type: 'json' })
  value: unknown;
}
