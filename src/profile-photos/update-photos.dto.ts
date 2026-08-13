import { IsArray, IsString, ArrayMaxSize, IsOptional } from 'class-validator';

export class UpdatePhotosDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Maximum 10 photos allowed' })
  @IsString({ each: true, message: 'Each photo must be a valid string' })
  photos: string[];
}
