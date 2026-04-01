import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
