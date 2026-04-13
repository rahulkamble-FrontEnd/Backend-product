import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddShortlistItemDto {
  @IsUUID('4')
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerNote?: string;
}
