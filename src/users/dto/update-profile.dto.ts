import {
  ArrayMaxSize,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  Min,
  Max,
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
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLongitude?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Long-term', 'Casual', 'Friendships', 'Not sure yet'])
  relationshipGoal?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'])
  zodiac?: string;

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
