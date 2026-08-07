import {
  IsArray,
  ArrayMinSize,
  IsUUID,
  IsOptional,
  IsIn,
  IsString,
  IsNumber,
} from 'class-validator';

export class BulkUpdateProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  productIds!: string[];

  @IsOptional()
  @IsIn(['draft', 'active', 'archived', 'published'])
  status?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bookName?: string;

  @IsOptional()
  @IsString()
  pageNumber?: string;

  @IsOptional()
  @IsString()
  application?: string;

  @IsOptional()
  @IsString()
  materialType?: string;

  @IsOptional()
  @IsString()
  finishType?: string;

  @IsOptional()
  @IsString()
  colorName?: string;

  @IsOptional()
  @IsString()
  colorHex?: string;

  @IsOptional()
  @IsString()
  thickness?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsNumber()
  performanceRating?: number;

  @IsOptional()
  @IsNumber()
  durabilityRating?: number;

  @IsOptional()
  @IsNumber()
  priceCategory?: number;

  @IsOptional()
  @IsNumber()
  maintenanceRating?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bestUsedFor?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pros?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cons?: string[];
}
