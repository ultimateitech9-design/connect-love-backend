import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { REFERRAL_CODE_PATTERN } from '../../referrals/referral-code';

export class GoogleAuthDto {
  @IsString()
  @MinLength(20)
  credential: string;
  @IsOptional()
  @IsString()
  @Matches(REFERRAL_CODE_PATTERN)
  referralCode?: string;
}
