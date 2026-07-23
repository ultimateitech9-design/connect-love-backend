import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UnregisterDeviceDto {
  @IsOptional()
  @IsString()
  @Length(10, 512)
  token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;
}
