import { IsString, Matches } from 'class-validator';
import { RegisterDto } from './register.dto';

export class VerifyRegistrationDto extends RegisterDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code.' })
  otp: string;
}
