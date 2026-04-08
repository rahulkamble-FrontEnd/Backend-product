import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
  ) {}

  async create(createProductDto: CreateProductDto, user: any): Promise<Product> {
    const { categoryIds, ...productData } = createProductDto;

    // Create unique slug from name
    const slug = productData.name.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);

    const newProduct = this.productRepository.create({
      ...productData,
      slug,
      createdBy: { id: user.id } as any,
    });

    const savedProduct = await this.productRepository.save(newProduct);

    if (categoryIds && categoryIds.length > 0) {
      const productCategories = categoryIds.map(categoryId => {
        return this.productCategoryRepository.create({
          product: { id: savedProduct.id } as any,
          category: { id: categoryId } as any,
        });
      });
      await this.productCategoryRepository.save(productCategories);
    }

    return savedProduct;
  }
}
