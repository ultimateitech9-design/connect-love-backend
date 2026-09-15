import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Call number is required.' })
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Call number must include a country code, for example +919876543210.' })
  @IsPhoneNumber(null, { message: 'Please enter a valid international phone number.' })
  phone: string;

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
