import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8,15}$/, { message: 'Phone number must contain only 8 to 15 digits.' })
  phone?: string;

  @IsOptional()
  @IsString()
  photoDataUrl?: string;

  @IsString()
  @MinLength(3)
  subject: string;

  @IsString()
  @MinLength(10)
  message: string;
}
