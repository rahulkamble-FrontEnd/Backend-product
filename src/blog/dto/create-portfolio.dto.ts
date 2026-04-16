import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePortfolioImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  s3Key: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class CreatePortfolioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  roomType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePortfolioImageDto)
  @IsOptional()
  images?: CreatePortfolioImageDto[];
}
