import {
  IsUUID,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  featuredImageS3Key?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  featuredImageAlt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  featuredImageTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(320)
  metaDescription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  seoKeyword?: string;

  @IsIn(['draft', 'published'])
  @IsOptional()
  status?: string;
}
