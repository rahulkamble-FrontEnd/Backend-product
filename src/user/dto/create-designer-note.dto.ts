import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDesignerNoteDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  note: string;
}
