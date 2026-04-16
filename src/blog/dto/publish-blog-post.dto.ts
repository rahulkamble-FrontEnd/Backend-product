import { IsDateString, IsOptional } from 'class-validator';

export class PublishBlogPostDto {
  @IsDateString()
  @IsOptional()
  publishedAt?: string;
}
