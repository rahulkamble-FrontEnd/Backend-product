import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { ProductImage } from './product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { S3Service } from '../common/services/s3.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly s3Service: S3Service,
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

  async uploadImage(
    productId: string,
    file: Express.Multer.File,
    dto: UploadProductImageDto,
  ): Promise<ProductImage> {
    // 1. Ensure product exists
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    // 2. Build a unique S3 key: products/{productId}/{uuid}.ext
    const fileExt = extname(file.originalname).toLowerCase();
    const s3Key = `products/${productId}/${uuidv4()}${fileExt}`;

    // 3. Upload to S3
    const uploadedKey = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype,
    );

    // 4. If isPrimary=true, reset all other images for this product
    if (dto.isPrimary) {
      await this.productImageRepository.update(
        { productId },
        { isPrimary: false },
      );
    }

    // 5. Save image record to DB
    const productImage = this.productImageRepository.create({
      productId,
      s3Key: uploadedKey,
      displayOrder: dto.displayOrder ?? 0,
      isPrimary: dto.isPrimary ?? false,
    });

    const savedImage = await this.productImageRepository.save(productImage);

    // 6. Attach public URL (not persisted, convenience response)
    (savedImage as any).url = this.s3Service.getPublicUrl(uploadedKey);

    return savedImage;
  }
}
