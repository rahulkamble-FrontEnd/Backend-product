import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDesignCfDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
