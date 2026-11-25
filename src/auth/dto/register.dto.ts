import {
  IsDateString,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  Max,
  Matches,
  Min,
} from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{24}$/)
  referralCode?: string;
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsDateString()
  birthDate: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'non-binary', 'prefer-not'])
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1500)
  locationAccuracy?: number;
}
