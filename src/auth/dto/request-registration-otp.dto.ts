import { IsEmail } from 'class-validator';

export class RequestRegistrationOtpDto {
  @IsEmail()
  email: string;
}
