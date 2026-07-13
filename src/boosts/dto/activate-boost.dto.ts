import { IsIn, IsUUID } from 'class-validator';
import type { BoostPlanKey } from '../boost.entity';

export class ActivateBoostDto {
  @IsIn(['30_minutes', '1_hour', '3_hours', '24_hours'])
  planKey: BoostPlanKey;

  @IsUUID()
  requestId: string;
}
