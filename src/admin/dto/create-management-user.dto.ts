import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateManagementUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(['admin', 'sales', 'support'])
  role: 'admin' | 'sales' | 'support';
}
