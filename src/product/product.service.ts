import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { ProductImage } from './product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { S3Service } from '../common/services/s3.service';
import { Category } from '../category/category.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    user: any,
  ): Promise<Product> {
    const { categoryIds, ...productData } = createProductDto;

    // Create unique slug from name
    const slug =
      productData.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Date.now().toString().slice(-4);

    const newProduct = this.productRepository.create({
      ...productData,
      slug,
      createdBy: { id: user.id } as any,
    });

    const savedProduct = await this.productRepository.save(newProduct);

    if (categoryIds && categoryIds.length > 0) {
      const productCategories = categoryIds.map((categoryId) => {
        return this.productCategoryRepository.create({
          product: { id: savedProduct.id } as any,
          category: { id: categoryId } as any,
        });
      });
      await this.productCategoryRepository.save(productCategories);
    }

    return savedProduct;
  }

  async listProducts(
    query: ListProductsQueryDto,
  ): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeImages = query.includeImages === 'true';
    const includeCategories = query.includeCategories === 'true';

    const qb = this.productRepository.createQueryBuilder('product');

    if (includeImages) {
      qb.leftJoinAndSelect('product.images', 'image');
    }

    if (includeCategories) {
      qb.leftJoinAndSelect('product.productCategories', 'productCategory');
      qb.leftJoinAndSelect('productCategory.category', 'category');
    } else if (query.categoryId || query.categoryType) {
      qb.leftJoin('product.productCategories', 'productCategory');
      qb.leftJoin('productCategory.category', 'category');
    }

    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }

    if (query.q) {
      const q = `%${query.q}%`;
      qb.andWhere(
        new Brackets((whereQb) => {
          whereQb
            .where('product.name LIKE :q', { q })
            .orWhere('product.sku LIKE :q', { q })
            .orWhere('product.brand LIKE :q', { q });
        }),
      );
    }

    if (query.categoryId) {
      qb.andWhere('productCategory.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.categoryType) {
      qb.andWhere('category.type = :categoryType', {
        categoryType: query.categoryType,
      });
    }

    const sortByMap: Record<string, string> = {
      createdAt: 'product.createdAt',
      updatedAt: 'product.updatedAt',
      name: 'product.name',
    };
    const sortBy =
      sortByMap[query.sortBy ?? 'createdAt'] ?? sortByMap.createdAt;
    const sortOrder =
      (query.sortOrder ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const skip = (page - 1) * limit;

    qb.distinct(true).orderBy(sortBy, sortOrder).skip(skip).take(limit);

    const [products, total] = await qb.getManyAndCount();

    const items: unknown[] = products.map((p) => {
      const item: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        description: p.description,
        materialType: p.materialType,
        finishType: p.finishType,
        colorName: p.colorName,
        colorHex: p.colorHex,
        thickness: p.thickness,
        dimensions: p.dimensions,
        performanceRating: p.performanceRating,
        durabilityRating: p.durabilityRating,
        priceCategory: p.priceCategory,
        maintenanceRating: p.maintenanceRating,
        bestUsedFor: p.bestUsedFor,
        pros: p.pros,
        cons: p.cons,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };

      if (includeImages) {
        item.images = (p.images ?? []).map((img) => ({
          id: img.id,
          s3Key: img.s3Key,
          url: this.s3Service.getPublicUrl(img.s3Key),
          displayOrder: img.displayOrder,
          isPrimary: img.isPrimary,
          createdAt: img.createdAt,
        }));
      }

      if (includeCategories) {
        item.categories = (p.productCategories ?? []).map((pc) => ({
          id: pc.id,
          categoryId: pc.categoryId,
          name: pc.category?.name,
          slug: pc.category?.slug,
          type: pc.category?.type,
          displayOrder: pc.category?.displayOrder,
          isActive: pc.category?.isActive,
        }));
      }

      return item;
    });

    return { items, total, page, limit };
  }

  async getProductBySlug(slug: string): Promise<unknown> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: {
        images: true,
        productCategories: { category: true },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    const images = [...(product.images ?? [])].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.displayOrder !== b.displayOrder)
        return a.displayOrder - b.displayOrder;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      brand: product.brand,
      description: product.description,
      materialType: product.materialType,
      finishType: product.finishType,
      colorName: product.colorName,
      colorHex: product.colorHex,
      thickness: product.thickness,
      dimensions: product.dimensions,
      performanceRating: product.performanceRating,
      durabilityRating: product.durabilityRating,
      priceCategory: product.priceCategory,
      maintenanceRating: product.maintenanceRating,
      bestUsedFor: product.bestUsedFor,
      pros: product.pros,
      cons: product.cons,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      images: images.map((img) => ({
        id: img.id,
        s3Key: img.s3Key,
        url: this.s3Service.getPublicUrl(img.s3Key),
        displayOrder: img.displayOrder,
        isPrimary: img.isPrimary,
        createdAt: img.createdAt,
      })),
      categories: (product.productCategories ?? []).map((pc) => ({
        id: pc.id,
        categoryId: pc.categoryId,
        name: pc.category?.name,
        slug: pc.category?.slug,
        type: pc.category?.type,
        displayOrder: pc.category?.displayOrder,
        isActive: pc.category?.isActive,
      })),
    };
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

  async linkCategories(
    productId: string,
    categoryIds: string[],
  ): Promise<{ added: number; skipped: string[]; invalid: string[] }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }
    const validCategories = await this.categoryRepository.find({
      where: { id: In(categoryIds) },
      select: ['id'],
    });
    const validIds = validCategories.map((c) => c.id);
    const invalid = categoryIds.filter((id) => !validIds.includes(id));
    const existing = await this.productCategoryRepository.find({
      where: { productId, categoryId: In(validIds) },
      select: ['categoryId'],
    });
    const existingIds = new Set(existing.map((e) => e.categoryId));
    const toCreateIds = validIds.filter((id) => !existingIds.has(id));
    const entities = toCreateIds.map((id) =>
      this.productCategoryRepository.create({
        productId,
        categoryId: id,
      }),
    );
    if (entities.length > 0) {
      await this.productCategoryRepository.save(entities);
    }
    const skipped = validIds.filter((id) => existingIds.has(id));
    return { added: entities.length, skipped, invalid };
  }
}
