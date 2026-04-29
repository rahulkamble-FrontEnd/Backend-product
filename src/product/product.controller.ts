import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Put,
  UseGuards,
  Req,
  Param,
  Query,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';
import { LinkProductCategoriesDto } from './dto/link-product-categories.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/dto/create-user.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { LinkProductTagDto } from './dto/link-product-tag.dto';
import type {
  AuthenticatedRequest,
  OptionalAuthenticatedRequest,
} from '../auth/types/auth-user.type';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_SPREADSHEET_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const ALLOWED_ZIP_MIME_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
];
const MAX_SPREADSHEET_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ZIP_UPLOAD_MAX_MB = Number(process.env.ZIP_UPLOAD_MAX_MB ?? 300);
const MAX_ZIP_SIZE_BYTES = ZIP_UPLOAD_MAX_MB * 1024 * 1024;

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async list(
    @Query() query: ListProductsQueryDto,
    @Req() req: OptionalAuthenticatedRequest,
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
    return this.productService.listProducts(query, req.user?.role);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('compare')
  async compare(
    @Query('ids') ids: string,
    @Req() req: OptionalAuthenticatedRequest,
  ): Promise<unknown> {
    return this.productService.compareProducts(ids, req.user?.role);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async getBySlug(
    @Param('slug') slug: string,
    @Req() req: OptionalAuthenticatedRequest,
  ): Promise<unknown> {
    return this.productService.getProductBySlug(slug, req.user?.role);
  }

  // ─────────────────────────────────────────────
  // POST /products
  // Admin: Create a new product
  // ─────────────────────────────────────────────
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Product> {
    return this.productService.create(createProductDto, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('bulk-upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'imagesZip', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: MAX_ZIP_SIZE_BYTES,
          files: 2,
        },
        fileFilter: (_req, file, cb) => {
          const originalName = file.originalname.toLowerCase();
          const isSpreadsheetField = file.fieldname === 'file';
          const isZipField = file.fieldname === 'imagesZip';

          if (isSpreadsheetField) {
            const hasXlsxExtension = originalName.endsWith('.xlsx');
            const allowedMimeType = ALLOWED_SPREADSHEET_MIME_TYPES.includes(
              file.mimetype,
            );
            const isGenericBinaryXlsx =
              file.mimetype === 'application/octet-stream' && hasXlsxExtension;
            if (!allowedMimeType && !isGenericBinaryXlsx) {
              return cb(
                new BadRequestException(
                  `Unsupported file type "${file.mimetype}". Upload an .xlsx file.`,
                ),
                false,
              );
            }
            return cb(null, true);
          }

          if (isZipField) {
            const hasZipExtension = originalName.endsWith('.zip');
            const allowedMimeType =
              ALLOWED_ZIP_MIME_TYPES.includes(file.mimetype) ||
              file.mimetype === 'application/octet-stream';
            if (!hasZipExtension || !allowedMimeType) {
              return cb(
                new BadRequestException(
                  `Unsupported ZIP file type "${file.mimetype}". Upload a .zip file in "imagesZip".`,
                ),
                false,
              );
            }
            return cb(null, true);
          }

          return cb(
            new BadRequestException(
              `Unsupported field "${file.fieldname}". Use "file" and optional "imagesZip".`,
            ),
            false,
          );
        },
      },
    ),
  )
  async bulkUploadProducts(
    @UploadedFiles()
    filesByField: {
      file?: Express.Multer.File[];
      imagesZip?: Express.Multer.File[];
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    totalRows: number;
    createdCount: number;
    failedCount: number;
    created: Array<{ row: number; id: string; sku: string; name: string }>;
    errors: Array<{ row: number; sku?: string; message: string }>;
  }> {
    const file = filesByField?.file?.[0];
    const imagesZip = filesByField?.imagesZip?.[0];

    if (!file) {
      throw new BadRequestException(
        'Spreadsheet file is required. Send it as multipart/form-data with field name "file".',
      );
    }
    if (file.size > MAX_SPREADSHEET_SIZE_BYTES) {
      throw new BadRequestException(
        `Spreadsheet is too large. Max allowed: ${MAX_SPREADSHEET_SIZE_BYTES / (1024 * 1024)} MB.`,
      );
    }

    return this.productService.bulkCreateFromXlsx(file, imagesZip, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.update(productId, dto);
  }

  // ─────────────────────────────────────────────
  // POST /products/:id/images
  // Admin: Upload an image for a product → S3
  // ─────────────────────────────────────────────
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/images')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'images', maxCount: 3 },
        { name: 'images[]', maxCount: 3 },
      ],
      {
        storage: memoryStorage(), // keep file in memory (buffer) so we can stream to S3
        limits: { fileSize: MAX_SIZE_BYTES },
        fileFilter: (_req, file, cb) => {
          if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(
              new BadRequestException(
                `Unsupported file type "${file.mimetype}". Allowed: jpeg, png, webp`,
              ),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async uploadImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFiles()
    filesByField: {
      image?: Express.Multer.File[];
      images?: Express.Multer.File[];
      'images[]'?: Express.Multer.File[];
    },
    @Body() dto: UploadProductImageDto,
  ): Promise<ProductImage | ProductImage[]> {
    const files = [
      ...(filesByField?.image ?? []),
      ...(filesByField?.images ?? []),
      ...(filesByField?.['images[]'] ?? []),
    ];

    if (files.length === 0) {
      throw new BadRequestException(
        'Image file is required. Send multipart/form-data with one of these field names: "image", "images", or "images[]".',
      );
    }

    if (files.length === 1) {
      return this.productService.uploadImage(productId, files[0], dto);
    }

    return this.productService.uploadImages(productId, files, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/categories')
  async linkCategories(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: LinkProductCategoriesDto,
  ): Promise<{ added: number; skipped: string[]; invalid: string[] }> {
    return this.productService.linkCategories(productId, dto.categoryIds);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/subcategories')
  async linkSubcategories(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: LinkProductCategoriesDto,
  ): Promise<{ added: number; skipped: string[]; invalid: string[] }> {
    return this.productService.linkCategories(productId, dto.categoryIds);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id/categories/:catId')
  async unlinkCategory(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('catId', ParseUUIDPipe) categoryId: string,
  ): Promise<{ message: string }> {
    return this.productService.unlinkCategory(productId, categoryId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id/subcategories/:subCategoryId')
  async unlinkSubcategory(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('subCategoryId', ParseUUIDPipe) subCategoryId: string,
  ): Promise<{ message: string }> {
    return this.productService.unlinkCategory(productId, subCategoryId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id/tags')
  async getLinkedTags(@Param('id', ParseUUIDPipe) productId: string): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      hexCode: string;
      createdBy: string | null;
      createdAt: Date;
    }>
  > {
    return this.productService.getLinkedTags(productId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/tags')
  async linkTag(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: LinkProductTagDto,
  ): Promise<{ message: string; linked: boolean }> {
    return this.productService.linkTag(productId, dto.tagId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id/tags/:tagId')
  async unlinkTag(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ): Promise<{ message: string }> {
    return this.productService.unlinkTag(productId, tagId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductStatusDto,
  ): Promise<Product> {
    return this.productService.updateStatus(productId, dto.status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id/images/:imgId')
  async removeImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('imgId', ParseUUIDPipe) imageId: string,
  ): Promise<{ message: string }> {
    return this.productService.removeProductImage(productId, imageId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<{ message: string }> {
    return this.productService.deleteProductPermanently(productId);
  }
}
