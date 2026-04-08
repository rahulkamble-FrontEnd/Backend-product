import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum UserRole {
  CUSTOMER = 'customer',
  DESIGNER = 'designer',
  ADMIN = 'admin',
  BLOGADMIN = 'blogadmin',
}

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;
}
