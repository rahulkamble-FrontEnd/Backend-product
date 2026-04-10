import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateProductStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['draft', 'active', 'archived', 'published'])
  status: string;
}
