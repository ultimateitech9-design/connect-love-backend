import {
  IsDateString,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  city?: string;

  @IsOptional()
  @IsLatitude()
  locationLatitude?: number;

  @IsOptional()
  @IsLongitude()
  locationLongitude?: number;
}
