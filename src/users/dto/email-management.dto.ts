import { IsEmail, Matches } from 'class-validator';

export class EmailDto { @IsEmail({}, { message: 'Please enter a valid email address.' }) email: string; }
export class EmailOtpDto extends EmailDto { @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code.' }) otp: string; }
export class OtpDto { @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code.' }) otp: string; }
