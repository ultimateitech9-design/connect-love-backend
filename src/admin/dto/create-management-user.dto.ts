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

  @IsIn(['user', 'admin', 'sales', 'support'])
  role: 'user' | 'admin' | 'sales' | 'support';
}
