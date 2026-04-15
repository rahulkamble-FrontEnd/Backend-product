import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTrendingEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  styleTag?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  s3Key: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  caption?: string;
}
