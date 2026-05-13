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
  materialType?: string;

  @IsOptional()
  @IsString()
  finishType?: string;

  @IsOptional()
  @IsString()
  colorName?: string;

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
  maintenanceRating?: number;
}
