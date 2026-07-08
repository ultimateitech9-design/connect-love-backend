import {
  ArrayMaxSize,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsArray,
  IsDateString,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  profession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  height?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personalityWords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 photos allowed' })
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  kycLivePhoto?: string;

  @IsOptional()
  @IsBoolean()
  kycMatched?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  kycMatchScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

  // ─── Settings ─────────────────────────────────────────────────────────────

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  showDistance?: boolean;

  @IsOptional()
  @IsBoolean()
  photosVisibleToNonMatches?: boolean;

  @IsOptional()
  @IsBoolean()
  onlyShowVerifiedProfiles?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMatches?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyPush?: boolean;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @IsString()
  language?: string;
}
