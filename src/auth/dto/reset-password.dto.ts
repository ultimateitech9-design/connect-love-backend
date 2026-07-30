import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code.' })
  otp: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  newPassword: string;
}
