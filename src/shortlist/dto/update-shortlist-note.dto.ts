import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateShortlistNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  customerNote: string;
}
