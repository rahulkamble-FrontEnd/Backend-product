import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { UpdateProductDto } from './dto/update-product.dto';

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
    if (productData.status === 'published') {
      productData.status = 'active';
    }

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

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    const updateData: Partial<Product> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const slug =
        dto.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '') +
        '-' +
        Date.now().toString().slice(-4);
      updateData.slug = slug;
    }

    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.materialType !== undefined) updateData.materialType = dto.materialType;
    if (dto.finishType !== undefined) updateData.finishType = dto.finishType;
    if (dto.colorName !== undefined) updateData.colorName = dto.colorName;
    if (dto.colorHex !== undefined) updateData.colorHex = dto.colorHex;
    if (dto.thickness !== undefined) updateData.thickness = dto.thickness;
    if (dto.dimensions !== undefined) updateData.dimensions = dto.dimensions;
    if (dto.performanceRating !== undefined)
      updateData.performanceRating = dto.performanceRating;
    if (dto.durabilityRating !== undefined)
      updateData.durabilityRating = dto.durabilityRating;
    if (dto.priceCategory !== undefined)
      updateData.priceCategory = dto.priceCategory;
    if (dto.maintenanceRating !== undefined)
      updateData.maintenanceRating = dto.maintenanceRating;
    if (dto.bestUsedFor !== undefined) updateData.bestUsedFor = dto.bestUsedFor;
    if (dto.pros !== undefined) updateData.pros = dto.pros;
    if (dto.cons !== undefined) updateData.cons = dto.cons;
    if (dto.status !== undefined) {
      updateData.status = dto.status === 'published' ? 'active' : dto.status;
    }

    await this.productRepository.update(id, updateData);
    const updated = await this.productRepository.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return updated;
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
      const status = query.status === 'published' ? 'active' : query.status;
      qb.andWhere('product.status = :status', { status });
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

  async compareProducts(idsParam: string): Promise<unknown> {
    if (!idsParam) {
      throw new BadRequestException('Query param "ids" is required (comma-separated UUIDs)');
    }

    const ids = Array.from(
      new Set(
        idsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );

    if (ids.length === 0) {
      throw new BadRequestException('At least 1 id is required in "ids"');
    }
    if (ids.length > 4) {
      throw new BadRequestException('Maximum 4 ids are allowed in "ids"');
    }

    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalid = ids.filter((id) => !uuidV4.test(id));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid UUID(s) in "ids": ${invalid.join(', ')}`);
    }

    const products = await this.productRepository.find({
      where: { id: In(ids) },
      relations: {
        images: true,
        productCategories: { category: true },
      },
    });

    const foundIds = new Set(products.map((p) => p.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));

    const normalized = products.map((p) => {
      const images = [...(p.images ?? [])].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      const primaryImage = images[0];

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        materialType: p.materialType,
        finishType: p.finishType,
        colorName: p.colorName,
        thickness: p.thickness,
        dimensions: p.dimensions,
        performanceRating: p.performanceRating,
        durabilityRating: p.durabilityRating,
        priceCategory: p.priceCategory,
        maintenanceRating: p.maintenanceRating,
        primaryImageUrl: primaryImage ? this.s3Service.getPublicUrl(primaryImage.s3Key) : null,
        categories: (p.productCategories ?? []).map((pc) => ({
          categoryId: pc.categoryId,
          name: pc.category?.name,
          slug: pc.category?.slug,
          type: pc.category?.type,
        })),
      };
    });

    const fields = [
      { key: 'name', values: normalized.map((p) => p.name) },
      { key: 'brand', values: normalized.map((p) => p.brand) },
      { key: 'materialType', values: normalized.map((p) => p.materialType) },
      { key: 'finishType', values: normalized.map((p) => p.finishType) },
      { key: 'colorName', values: normalized.map((p) => p.colorName) },
      { key: 'thickness', values: normalized.map((p) => p.thickness) },
      { key: 'dimensions', values: normalized.map((p) => p.dimensions) },
      { key: 'performanceRating', values: normalized.map((p) => p.performanceRating) },
      { key: 'durabilityRating', values: normalized.map((p) => p.durabilityRating) },
      { key: 'priceCategory', values: normalized.map((p) => p.priceCategory) },
      { key: 'maintenanceRating', values: normalized.map((p) => p.maintenanceRating) },
    ];

    return { ids, missingIds, products: normalized, fields };
  }

  async softDeleteProduct(productId: string): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      withDeleted: true,
      select: ['id', 'deletedAt'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    if (product.deletedAt) {
      return { message: `Product with id "${productId}" is already deleted` };
    }

    await this.productRepository.softDelete(productId);
    return { message: `Product with id "${productId}" has been deleted` };
  }

  async removeProductImage(
    productId: string,
    imageId: string,
  ): Promise<{ message: string }> {
    const image = await this.productImageRepository.findOne({
      where: { id: imageId, productId },
      select: ['id', 'productId', 's3Key', 'isPrimary'],
    });
    if (!image) {
      throw new NotFoundException(
        `Image with id "${imageId}" not found for product "${productId}"`,
      );
    }

    await this.s3Service.deleteFile(image.s3Key);
    await this.productImageRepository.delete({ id: imageId });

    if (image.isPrimary) {
      const next = await this.productImageRepository.findOne({
        where: { productId },
        order: { isPrimary: 'DESC', displayOrder: 'ASC', createdAt: 'ASC' },
      });
      if (next) {
        await this.productImageRepository.update(
          { id: next.id },
          { isPrimary: true },
        );
      }
    }

    return { message: `Image "${imageId}" removed for product "${productId}"` };
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

  async unlinkCategory(
    productId: string,
    categoryId: string,
  ): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      select: ['id'],
    });
    if (!category) {
      throw new NotFoundException(`Category with id "${categoryId}" not found`);
    }

    const result = await this.productCategoryRepository.delete({
      productId,
      categoryId,
    });

    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(
        `Category "${categoryId}" is not linked to product "${productId}"`,
      );
    }

    return {
      message: `Category "${categoryId}" unlinked from product "${productId}"`,
    };
  }

  async updateStatus(productId: string, status: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const normalizedStatus = status === 'published' ? 'active' : status;

    await this.productRepository.update(productId, { status: normalizedStatus });
    const updated = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!updated) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }
    return updated;
  }
}
