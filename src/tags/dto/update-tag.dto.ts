import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTagDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @IsHexColor()
  hex_code?: string;
}
