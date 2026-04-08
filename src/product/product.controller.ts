import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/dto/create-user.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ─────────────────────────────────────────────
  // POST /products
  // Admin: Create a new product
  // ─────────────────────────────────────────────
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: any,
  ): Promise<Product> {
    return this.productService.create(createProductDto, req.user);
  }

  // ─────────────────────────────────────────────
  // POST /products/:id/images
  // Admin: Upload an image for a product → S3
  // ─────────────────────────────────────────────
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('image', {
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
    }),
  )
  async uploadImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProductImageDto,
  ): Promise<ProductImage> {
    if (!file) {
      throw new BadRequestException(
        'Image file is required. Send it as multipart/form-data with field name "image".',
      );
    }
    return this.productService.uploadImage(productId, file, dto);
  }
}
