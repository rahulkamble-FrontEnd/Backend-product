import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(['material', 'furniture'])
  type?: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;
}
