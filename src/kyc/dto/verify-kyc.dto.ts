import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class VerifyKycDto {
  @IsArray()
  @ArrayMinSize(3, { message: 'Capture at least 3 live camera frames.' })
  @ArrayMaxSize(5, { message: 'Maximum 5 live camera frames allowed.' })
  @IsString({ each: true })
  liveFrames: string[];
}
