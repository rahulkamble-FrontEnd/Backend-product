import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class LinkProductCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  categoryIds: string[];
}
