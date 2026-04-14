import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateDesignerNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;

  @IsUUID()
  @IsOptional()
  productId?: string;
}
