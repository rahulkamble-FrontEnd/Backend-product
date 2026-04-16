import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from './blog-post.entity';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { Portfolio } from '../portfolio/portfolio.entity';
import { PortfolioImage } from '../portfolio/portfolio-image.entity';
import { Trending } from '../trending/trending.entity';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlogPost, Portfolio, PortfolioImage, Trending]),
  ],
  controllers: [BlogController],
  providers: [BlogService, S3Service],
})
export class BlogModule {}
