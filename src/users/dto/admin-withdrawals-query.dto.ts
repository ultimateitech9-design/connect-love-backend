import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AdminWithdrawalsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsIn(['all', 'pending', 'completed', 'rejected']) status = 'all';
  @IsOptional() @IsIn(['all', 'referral', 'coins']) source = 'all';
  @IsOptional() @IsString() @MaxLength(100) search = '';
}
