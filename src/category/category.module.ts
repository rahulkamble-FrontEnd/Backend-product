import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { ProductCategory } from '../product/product-category.entity';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Category, ProductCategory])],
  providers: [CategoryService, OptionalJwtAuthGuard],
  controllers: [CategoryController],
  exports: [CategoryService],
})
export class CategoryModule {}
