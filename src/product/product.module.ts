import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { ProductImage } from './product-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory, ProductImage])],
})
export class ProductModule {}
