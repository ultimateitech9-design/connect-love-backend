import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { DevicePlatform } from '../user-device.entity';

export class RegisterDeviceDto {
  @IsString()
  @Length(10, 512)
  token: string;

  @IsIn(['android', 'ios', 'web', 'unknown'])
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}
