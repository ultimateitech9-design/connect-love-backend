import { IsArray, IsString, ArrayMaxSize, IsOptional } from 'class-validator';

export class UpdatePhotosDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 photos allowed' })
  @IsString({ each: true, message: 'Each photo must be a valid string' })
  photos: string[];
}
