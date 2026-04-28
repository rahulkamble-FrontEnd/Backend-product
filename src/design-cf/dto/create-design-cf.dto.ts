import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDesignCfDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}
