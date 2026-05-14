import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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
  @MaxLength(500)
  socialImageS3Key?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(320)
  metaDescription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  seoKeyword?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  secondaryKeywords?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  canonicalUrl?: string;

  @IsIn(['index', 'noindex'])
  @IsOptional()
  metaRobots?: string;

  @IsIn(['draft', 'published'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  publishedAt?: string;
}
