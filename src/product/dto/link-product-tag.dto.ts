import { IsNotEmpty, IsUUID } from 'class-validator';

export class LinkProductTagDto {
  @IsUUID()
  @IsNotEmpty()
  tagId: string;
}
