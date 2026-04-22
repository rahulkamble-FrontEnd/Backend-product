import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { ProductImage } from './product-image.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { S3Service } from '../common/services/s3.service';
import { Category } from '../category/category.entity';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductCategory,
      ProductImage,
      Category,
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService, S3Service, OptionalJwtAuthGuard],
})
export class ProductModule {}
