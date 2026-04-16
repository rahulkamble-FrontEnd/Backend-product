import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBlogPostDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(270)
  slug?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoryTag?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  featuredImageS3Key?: string;

  @IsIn(['draft', 'published'])
  @IsOptional()
  status?: string;
}
