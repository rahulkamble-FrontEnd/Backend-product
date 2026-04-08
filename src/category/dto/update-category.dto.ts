import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['material', 'furniture'])
  type?: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;
}