import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(270)
  slug: string;

  @IsString()
  @IsNotEmpty()
  body: string;

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
