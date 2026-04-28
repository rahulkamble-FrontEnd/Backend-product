import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import AdmZip from 'adm-zip';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { ProductImage } from './product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { S3Service } from '../common/services/s3.service';
import { Category } from '../category/category.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import * as XLSX from 'xlsx';
import { UserRole } from '../user/dto/create-user.dto';
import { ProductTag } from './product-tag.entity';
import { Tag } from '../tags/tag.entity';
import type { AuthUser } from '../auth/types/auth-user.type';

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
    @InjectRepository(ProductTag)
    private readonly productTagRepository: Repository<ProductTag>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    user: AuthUser,
  ): Promise<Product> {
    const { categoryIds, ...productData } = createProductDto;
    const normalizedCategoryIds = Array.from(
      new Set((categoryIds ?? []).map((id) => id?.trim()).filter(Boolean)),
    );

    if (normalizedCategoryIds.length > 0) {
      const existingCategories = await this.categoryRepository.find({
        where: { id: In(normalizedCategoryIds) },
        relations: ['parent'],
      });
      const existingCategoryIds = new Set(
        existingCategories.map((cat) => cat.id),
      );
      const invalidCategoryIds = normalizedCategoryIds.filter(
        (id) => !existingCategoryIds.has(id),
      );
      if (invalidCategoryIds.length > 0) {
        throw new BadRequestException(
          `Invalid categoryIds: ${invalidCategoryIds.join(', ')}`,
        );
      }

      const nonSubCategoryIds = existingCategories
        .filter((cat) => !cat.parent)
        .map((cat) => cat.id);
      if (nonSubCategoryIds.length > 0) {
        throw new BadRequestException(
          `Products can only be linked to sub-categories. Top-level categoryIds: ${nonSubCategoryIds.join(', ')}`,
        );
      }
    }

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

    return this.productRepository.manager.transaction(async (manager) => {
      const txProductRepository = manager.getRepository(Product);
      const txProductCategoryRepository =
        manager.getRepository(ProductCategory);

      const newProduct = txProductRepository.create({
        ...productData,
        slug,
        createdBy: { id: user.id },
      });

      const savedProduct = await txProductRepository.save(newProduct);

      if (normalizedCategoryIds.length > 0) {
        const productCategories = normalizedCategoryIds.map((categoryId) =>
          txProductCategoryRepository.create({
            productId: savedProduct.id,
            categoryId,
          }),
        );
        await txProductCategoryRepository.save(productCategories);
      }

      return savedProduct;
    });
  }

  async bulkCreateFromXlsx(
    file: Express.Multer.File,
    imagesZipFile: Express.Multer.File | undefined,
    user: AuthUser,
  ): Promise<{
    totalRows: number;
    createdCount: number;
    failedCount: number;
    created: Array<{ row: number; id: string; sku: string; name: string }>;
    errors: Array<{ row: number; message: string }>;
  }> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded spreadsheet is empty');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('Spreadsheet does not contain any sheet');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
    });

    if (rawRows.length === 0) {
      throw new BadRequestException('Spreadsheet has no data rows');
    }

    const created: Array<{
      row: number;
      id: string;
      sku: string;
      name: string;
    }> = [];
    const errors: Array<{ row: number; message: string }> = [];
    const zipImagesBySku = this.buildZipImagesBySku(imagesZipFile);

    for (let index = 0; index < rawRows.length; index++) {
      const excelRowNumber = index + 2; // Header row is row 1
      try {
        const dto = this.buildCreateProductDtoFromRow(rawRows[index]);
        const product = await this.create(dto, user);
        await this.uploadBulkImagesFromZip(
          product.id,
          product.sku,
          zipImagesBySku,
        );
        created.push({
          row: excelRowNumber,
          id: product.id,
          sku: product.sku,
          name: product.name,
        });
      } catch (error: unknown) {
        errors.push({
          row: excelRowNumber,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create product for this row',
        });
      }
    }

    return {
      totalRows: rawRows.length,
      createdCount: created.length,
      failedCount: errors.length,
      created,
      errors,
    };
  }

  private buildZipImagesBySku(
    imagesZipFile: Express.Multer.File | undefined,
  ): Map<string, Array<{ sequence: number; fileName: string; file: Buffer }>> {
    const imagesBySku = new Map<
      string,
      Array<{ sequence: number; fileName: string; file: Buffer }>
    >();

    if (!imagesZipFile?.buffer || imagesZipFile.buffer.length === 0) {
      return imagesBySku;
    }

    const zip = new AdmZip(imagesZipFile.buffer);
    const entries = zip.getEntries();

    for (const entry of entries) {
      if (entry.isDirectory) {
        continue;
      }

      const fileName = entry.entryName.split('/').pop()?.trim() ?? '';
      if (!fileName) {
        continue;
      }

      const parsed = this.parseBulkImageFileName(fileName);
      if (!parsed) {
        continue;
      }

      const fileBuffer = entry.getData();
      if (!fileBuffer || fileBuffer.length === 0) {
        continue;
      }

      const list = imagesBySku.get(parsed.sku) ?? [];
      list.push({
        sequence: parsed.sequence,
        fileName,
        file: fileBuffer,
      });
      imagesBySku.set(parsed.sku, list);
    }

    for (const list of imagesBySku.values()) {
      list.sort(
        (a, b) =>
          a.sequence - b.sequence || a.fileName.localeCompare(b.fileName),
      );
    }

    return imagesBySku;
  }

  private parseBulkImageFileName(
    fileName: string,
  ): { sku: string; sequence: number } | null {
    const match = /^(.+)-(\d+)\.(jpe?g|png|webp)$/i.exec(fileName);
    if (!match) {
      return null;
    }
    const sequence = Number(match[2]);
    if (!Number.isInteger(sequence) || sequence <= 0) {
      return null;
    }

    return { sku: match[1], sequence };
  }

  private getMimeTypeFromFileName(fileName: string): string {
    const ext = extname(fileName).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    throw new BadRequestException(
      `Unsupported image extension in "${fileName}"`,
    );
  }

  private async uploadBulkImagesFromZip(
    productId: string,
    sku: string,
    zipImagesBySku: Map<
      string,
      Array<{ sequence: number; fileName: string; file: Buffer }>
    >,
  ): Promise<void> {
    const images = zipImagesBySku.get(sku);
    if (!images || images.length === 0) {
      return;
    }

    const selectedImages = images.slice(0, 3);
    for (let index = 0; index < selectedImages.length; index++) {
      const image = selectedImages[index];
      await this.saveProductImageFromBuffer(
        productId,
        image.fileName,
        image.file,
        this.getMimeTypeFromFileName(image.fileName),
        { displayOrder: index, isPrimary: index === 0 },
      );
    }
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
    if (dto.imsId !== undefined) updateData.imsId = dto.imsId;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.bookName !== undefined) updateData.bookName = dto.bookName;
    if (dto.pageNumber !== undefined) updateData.pageNumber = dto.pageNumber;
    if (dto.application !== undefined) updateData.application = dto.application;
    if (dto.materialType !== undefined)
      updateData.materialType = dto.materialType;
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
    requesterRole?: string,
  ): Promise<{
    items: unknown[];
    total: number;
    page: number;
    limit: number;
    filters: {
      finishes: string[];
      brands: string[];
      thicknesses: string[];
      colors: string[];
    };
  }> {
    const hideBrand = requesterRole === UserRole.CUSTOMER;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeImages = query.includeImages === 'true';
    const includeCategories = query.includeCategories === 'true';
    const brandFilters = this.parseCsvFilter(query.brand);
    const finishFilters = this.parseCsvFilter(query.finishType);
    const thicknessFilters = this.parseCsvFilter(query.thickness);
    const colorFilters = this.parseCsvFilter(query.colorName);

    const qb = this.productRepository.createQueryBuilder('product');

    if (includeImages) {
      qb.leftJoinAndSelect('product.images', 'image');
    }

    if (includeCategories) {
      qb.leftJoinAndSelect('product.productCategories', 'productCategory');
      qb.leftJoinAndSelect('productCategory.category', 'category');
    } else if (query.categoryId || query.categoryType || query.categorySlug) {
      qb.leftJoin('product.productCategories', 'productCategory');
      qb.leftJoin('productCategory.category', 'category');
    }

    if (query.categorySlug) {
      qb.leftJoin('category.parent', 'parentCategory');
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
      const requestedCategory = await this.categoryRepository.findOne({
        where: { id: query.categoryId },
        relations: ['parent'],
      });

      if (requestedCategory && !requestedCategory.parent) {
        const childCategoryRows = await this.categoryRepository
          .createQueryBuilder('childCategory')
          .leftJoin('childCategory.parent', 'parentCategory')
          .select('childCategory.id', 'id')
          .where('parentCategory.id = :parentId', { parentId: query.categoryId })
          .getRawMany<{ id: string }>();

        const categoryIds = Array.from(
          new Set([
            query.categoryId,
            ...childCategoryRows.map((row) => row.id).filter(Boolean),
          ]),
        );

        qb.andWhere('productCategory.categoryId IN (:...categoryIds)', {
          categoryIds,
        });
      } else {
        qb.andWhere('productCategory.categoryId = :categoryId', {
          categoryId: query.categoryId,
        });
      }
    }

    if (query.categoryType) {
      qb.andWhere('category.type = :categoryType', {
        categoryType: query.categoryType,
      });
    }

    if (query.categorySlug) {
      qb.andWhere(
        new Brackets((whereQb) => {
          whereQb
            .where('category.slug = :categorySlug', {
              categorySlug: query.categorySlug,
            })
            .orWhere('parentCategory.slug = :categorySlug', {
              categorySlug: query.categorySlug,
            });
        }),
      );
    }

    if (brandFilters.length > 0) {
      qb.andWhere('product.brand IN (:...brandFilters)', { brandFilters });
    }

    if (finishFilters.length > 0) {
      qb.andWhere('product.finishType IN (:...finishFilters)', { finishFilters });
    }

    if (thicknessFilters.length > 0) {
      qb.andWhere('product.thickness IN (:...thicknessFilters)', {
        thicknessFilters,
      });
    }

    if (colorFilters.length > 0) {
      qb.andWhere('product.colorName IN (:...colorFilters)', { colorFilters });
    }

    const filterRows = await qb
      .clone()
      .select([
        'product.brand AS brand',
        'product.finishType AS finishType',
        'product.thickness AS thickness',
        'product.colorName AS colorName',
      ])
      .getRawMany<{
        brand: string | null;
        finishType: string | null;
        thickness: string | null;
        colorName: string | null;
      }>();

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
        imsId: p.imsId,
        description: p.description,
        bookName: p.bookName,
        pageNumber: p.pageNumber,
        application: p.application,
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

      if (!hideBrand) {
        item.brand = p.brand;
      }

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

    const brands = this.extractCleanFilterValues(filterRows, 'brand');
    const finishes = this.extractCleanFilterValues(filterRows, 'finishType');
    const thicknesses = this.extractCleanFilterValues(filterRows, 'thickness');
    const colors = this.extractCleanFilterValues(filterRows, 'colorName');

    return {
      items,
      total,
      page,
      limit,
      filters: { finishes, brands, thicknesses, colors },
    };
  }

  private parseCsvFilter(value?: string): string[] {
    if (!value) {
      return [];
    }
    return Array.from(
      new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  private extractCleanFilterValues<T extends Record<string, string | null>>(
    rows: T[],
    key: keyof T,
  ): string[] {
    const values = new Set<string>();
    for (const row of rows) {
      const raw = row[key];
      if (typeof raw !== 'string') {
        continue;
      }
      const cleaned = raw.trim();
      if (!cleaned || !/[a-z0-9]/i.test(cleaned)) {
        continue;
      }
      values.add(cleaned);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  async getProductBySlug(
    slug: string,
    requesterRole?: string,
  ): Promise<unknown> {
    const hideBrand = requesterRole === UserRole.CUSTOMER;
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

    const item: Record<string, unknown> = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      imsId: product.imsId,
      description: product.description,
      bookName: product.bookName,
      pageNumber: product.pageNumber,
      application: product.application,
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

    if (!hideBrand) {
      item.brand = product.brand;
    }

    return item;
  }

  async compareProducts(
    idsParam: string,
    requesterRole?: string,
  ): Promise<unknown> {
    const hideBrand = requesterRole === UserRole.CUSTOMER;
    if (!idsParam) {
      throw new BadRequestException(
        'Query param "ids" is required (comma-separated UUIDs)',
      );
    }

    const ids = Array.from(
      new Set(
        idsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );

    if (ids.length < 2) {
      throw new BadRequestException('Minimum 2 ids are required in "ids"');
    }
    if (ids.length > 4) {
      throw new BadRequestException('Maximum 4 ids are allowed in "ids"');
    }

    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalid = ids.filter((id) => !uuidV4.test(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid UUID(s) in "ids": ${invalid.join(', ')}`,
      );
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
        if (a.displayOrder !== b.displayOrder)
          return a.displayOrder - b.displayOrder;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      const primaryImage = images[0];

      const item: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        imsId: p.imsId,
        description: p.description,
        bookName: p.bookName,
        pageNumber: p.pageNumber,
        application: p.application,
        materialType: p.materialType,
        finishType: p.finishType,
        colorName: p.colorName,
        thickness: p.thickness,
        dimensions: p.dimensions,
        performanceRating: p.performanceRating,
        durabilityRating: p.durabilityRating,
        priceCategory: p.priceCategory,
        maintenanceRating: p.maintenanceRating,
        primaryImageUrl: primaryImage
          ? this.s3Service.getPublicUrl(primaryImage.s3Key)
          : null,
        categories: (p.productCategories ?? []).map((pc) => ({
          categoryId: pc.categoryId,
          name: pc.category?.name,
          slug: pc.category?.slug,
          type: pc.category?.type,
        })),
      };

      if (!hideBrand) {
        item.brand = p.brand;
      }

      return item;
    });

    const fields = [
      { key: 'imsId', values: normalized.map((p) => p.imsId) },
      { key: 'name', values: normalized.map((p) => p.name) },
      { key: 'bookName', values: normalized.map((p) => p.bookName) },
      { key: 'pageNumber', values: normalized.map((p) => p.pageNumber) },
      { key: 'application', values: normalized.map((p) => p.application) },
      { key: 'materialType', values: normalized.map((p) => p.materialType) },
      { key: 'finishType', values: normalized.map((p) => p.finishType) },
      { key: 'colorName', values: normalized.map((p) => p.colorName) },
      { key: 'thickness', values: normalized.map((p) => p.thickness) },
      { key: 'dimensions', values: normalized.map((p) => p.dimensions) },
      {
        key: 'performanceRating',
        values: normalized.map((p) => p.performanceRating),
      },
      {
        key: 'durabilityRating',
        values: normalized.map((p) => p.durabilityRating),
      },
      { key: 'priceCategory', values: normalized.map((p) => p.priceCategory) },
      {
        key: 'maintenanceRating',
        values: normalized.map((p) => p.maintenanceRating),
      },
    ];

    const visibleFields = hideBrand
      ? fields
      : [{ key: 'brand', values: normalized.map((p) => p.brand) }, ...fields];

    return { ids, missingIds, products: normalized, fields: visibleFields };
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

    const existingImageCount = await this.productImageRepository.count({
      where: { productId },
    });
    if (existingImageCount >= 3) {
      throw new BadRequestException(
        'A product can have maximum 3 images. Delete an existing image before uploading a new one.',
      );
    }

    return this.saveProductImageFromBuffer(
      productId,
      file.originalname,
      file.buffer,
      file.mimetype,
      dto,
    );
  }

  async uploadImages(
    productId: string,
    files: Express.Multer.File[],
    dto: UploadProductImageDto,
  ): Promise<ProductImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    if (files.length > 3) {
      throw new BadRequestException(
        'You can upload maximum 3 images at a time',
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const existingImageCount = await this.productImageRepository.count({
      where: { productId },
    });
    if (existingImageCount + files.length > 3) {
      throw new BadRequestException(
        `A product can have maximum 3 images. This product already has ${existingImageCount} image(s).`,
      );
    }

    if (dto.isPrimary) {
      await this.productImageRepository.update(
        { productId },
        { isPrimary: false },
      );
    }

    const uploadedImages: ProductImage[] = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const savedImage = await this.saveProductImageFromBuffer(
        productId,
        file.originalname,
        file.buffer,
        file.mimetype,
        {
          displayOrder: (dto.displayOrder ?? 0) + index,
          isPrimary: dto.isPrimary ? index === 0 : false,
        },
      );
      uploadedImages.push(savedImage);
    }

    return uploadedImages;
  }

  private async saveProductImageFromBuffer(
    productId: string,
    originalName: string,
    buffer: Buffer,
    mimeType: string,
    dto: UploadProductImageDto,
  ): Promise<ProductImage> {
    const fileExt = extname(originalName).toLowerCase();
    const s3Key = `products/${productId}/${uuidv4()}${fileExt}`;
    const uploadedKey = await this.s3Service.uploadFile(
      s3Key,
      buffer,
      mimeType,
    );

    if (dto.isPrimary) {
      await this.productImageRepository.update(
        { productId },
        { isPrimary: false },
      );
    }

    const productImage = this.productImageRepository.create({
      productId,
      s3Key: uploadedKey,
      displayOrder: dto.displayOrder ?? 0,
      isPrimary: dto.isPrimary ?? false,
    });

    const savedImage = await this.productImageRepository.save(productImage);
    return {
      ...savedImage,
      url: this.s3Service.getPublicUrl(uploadedKey),
    } as ProductImage;
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
      relations: ['parent'],
    });
    const validSubCategories = validCategories.filter(
      (category) => category.parent,
    );
    const validIds = validSubCategories.map((c) => c.id);
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

    await this.productRepository.update(productId, {
      status: normalizedStatus,
    });
    const updated = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!updated) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }
    return updated;
  }

  async linkTag(
    productId: string,
    tagId: string,
  ): Promise<{ message: string; linked: boolean }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
      select: ['id'],
    });
    if (!tag) {
      throw new NotFoundException(`Tag with id "${tagId}" not found`);
    }

    const existing = await this.productTagRepository.findOne({
      where: { productId, tagId },
      select: ['id'],
    });
    if (existing) {
      return {
        message: `Tag "${tagId}" is already linked to product "${productId}"`,
        linked: false,
      };
    }

    const entity = this.productTagRepository.create({ productId, tagId });
    await this.productTagRepository.save(entity);

    return {
      message: `Tag "${tagId}" linked to product "${productId}"`,
      linked: true,
    };
  }

  async getLinkedTags(productId: string): Promise<Tag[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const links = await this.productTagRepository.find({
      where: { productId },
      relations: { tag: true },
      order: { id: 'ASC' },
    });

    return links
      .map((link) => link.tag)
      .filter((tag): tag is Tag => Boolean(tag));
  }

  async unlinkTag(
    productId: string,
    tagId: string,
  ): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
      select: ['id'],
    });
    if (!tag) {
      throw new NotFoundException(`Tag with id "${tagId}" not found`);
    }

    const result = await this.productTagRepository.delete({ productId, tagId });
    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(
        `Tag "${tagId}" is not linked to product "${productId}"`,
      );
    }

    return { message: `Tag "${tagId}" unlinked from product "${productId}"` };
  }

  private buildCreateProductDtoFromRow(
    row: Record<string, unknown>,
  ): CreateProductDto {
    const normalizedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[this.normalizeHeaderKey(key)] = value;
    }

    const name = this.toOptionalString(normalizedRow.name);
    const sku = this.toOptionalString(normalizedRow.sku);
    const imsId = this.toOptionalString(normalizedRow.imsid);

    if (!name) {
      throw new BadRequestException('Missing required field "name"');
    }
    if (!sku) {
      throw new BadRequestException('Missing required field "sku"');
    }
    if (!imsId) {
      throw new BadRequestException('Missing required field "imsId"');
    }

    const status = this.toOptionalString(normalizedRow.status);
    if (
      status &&
      !['draft', 'active', 'archived', 'published'].includes(
        status.toLowerCase(),
      )
    ) {
      throw new BadRequestException(
        `Invalid status "${status}". Allowed: draft, active, archived, published`,
      );
    }

    return {
      name,
      sku,
      imsId,
      brand: this.toOptionalString(normalizedRow.brand),
      description: this.toOptionalString(normalizedRow.description),
      bookName: this.toOptionalString(normalizedRow.bookname),
      pageNumber: this.toOptionalString(normalizedRow.pagenumber),
      application: this.toOptionalString(normalizedRow.application),
      materialType: this.toOptionalString(normalizedRow.materialtype),
      finishType: this.toOptionalString(normalizedRow.finishtype),
      colorName: this.toOptionalString(normalizedRow.colorname),
      colorHex: this.toOptionalString(normalizedRow.colorhex),
      thickness: this.toOptionalString(normalizedRow.thickness),
      dimensions: this.toOptionalString(normalizedRow.dimensions),
      performanceRating: this.toOptionalNumber(normalizedRow.performancerating),
      durabilityRating: this.toOptionalNumber(normalizedRow.durabilityrating),
      priceCategory: this.toOptionalNumber(normalizedRow.pricecategory),
      maintenanceRating: this.toOptionalNumber(normalizedRow.maintenancerating),
      bestUsedFor: this.toOptionalStringArray(normalizedRow.bestusedfor),
      pros: this.toOptionalStringArray(normalizedRow.pros),
      cons: this.toOptionalStringArray(normalizedRow.cons),
      status: status?.toLowerCase(),
      categoryIds:
        this.toOptionalStringArray(normalizedRow.subcategoryids) ??
        this.toOptionalStringArray(normalizedRow.categoryids),
    };
  }

  private normalizeHeaderKey(input: string): string {
    return input.toLowerCase().replace(/[\s_-]+/g, '');
  }

  private toOptionalString(value: unknown): string | undefined {
    if (!this.isStringifiablePrimitive(value)) {
      return undefined;
    }
    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      !this.isStringifiablePrimitive(value)
    ) {
      return undefined;
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new BadRequestException('Invalid number value');
    }
    return num;
  }

  private toOptionalStringArray(value: unknown): string[] | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (Array.isArray(value)) {
      const arr = value
        .map((item) => this.coerceArrayItemToString(item))
        .filter((item): item is string => Boolean(item));
      return arr.length > 0 ? arr : undefined;
    }
    if (!this.isStringifiablePrimitive(value)) {
      return undefined;
    }

    const str = String(value).trim();
    if (!str) {
      return undefined;
    }

    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed: unknown = JSON.parse(str);
        if (Array.isArray(parsed)) {
          const arr = parsed
            .map((item) => this.coerceArrayItemToString(item))
            .filter((item): item is string => Boolean(item));
          return arr.length > 0 ? arr : undefined;
        }
      } catch {
        // Fallback to comma split below
      }
    }

    const arr = str
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  }

  private coerceArrayItemToString(value: unknown): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || undefined;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return undefined;
  }

  private isStringifiablePrimitive(
    value: unknown,
  ): value is string | number | boolean | bigint {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    );
  }
}
