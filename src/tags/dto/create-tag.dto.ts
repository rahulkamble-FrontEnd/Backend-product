import { IsHexColor, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsHexColor()
  hex_code: string;
}
