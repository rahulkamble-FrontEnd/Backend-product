import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDesignerRecommendationDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsNotEmpty()
  shortlistedProductId: string;

  @IsString()
  @IsOptional()
  note?: string;
}
