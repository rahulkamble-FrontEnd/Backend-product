import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  IsNumber,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  materialType?: string;

  @IsString()
  @IsOptional()
  finishType?: string;

  @IsString()
  @IsOptional()
  colorName?: string;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsString()
  @IsOptional()
  thickness?: string;

  @IsString()
  @IsOptional()
  dimensions?: string;

  @IsNumber()
  @IsOptional()
  performanceRating?: number;

  @IsNumber()
  @IsOptional()
  durabilityRating?: number;

  @IsNumber()
  @IsOptional()
  priceCategory?: number;

  @IsNumber()
  @IsOptional()
  maintenanceRating?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bestUsedFor?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pros?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cons?: string[];

  @IsIn(['draft', 'active', 'archived', 'published'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}
