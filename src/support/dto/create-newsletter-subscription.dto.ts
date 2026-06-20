import { IsEmail } from 'class-validator';

export class CreateNewsletterSubscriptionDto {
  @IsEmail()
  email: string;
}
