import { IsIn } from 'class-validator';

export class AdminAgentStatusDto {
  @IsIn(['active', 'banned']) status: 'active' | 'banned';
}
