import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class EmailAudienceDto {
  @IsOptional() @IsIn(['all', 'female', 'male', 'inactive']) audience: 'all' | 'female' | 'male' | 'inactive' = 'all';
  @IsOptional() @IsString() @MaxLength(100) search = '';
}

export class EmailRecipientsQueryDto extends EmailAudienceDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
}

export class FailedEmailsQueryDto {
  @IsOptional() @IsIn(['all', 'female', 'male']) gender: 'all' | 'female' | 'male' = 'all';
  @IsOptional() @IsString() @MaxLength(100) search = '';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
}

export class SendAdminEmailDto extends EmailAudienceDto {
  @IsUUID() requestId: string;
  @IsBoolean() selectAll: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20000) @ArrayUnique() @IsUUID('all', { each: true }) userIds: string[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(20000) @ArrayUnique() @IsUUID('all', { each: true }) excludedUserIds: string[] = [];
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(200) subject: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(10000) message: string;
  @IsOptional() @IsString() @MaxLength(4200000) imageDataUrl?: string;
}
