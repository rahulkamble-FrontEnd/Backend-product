import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/dto/create-user.dto';
import type { AuthenticatedRequest } from '../auth/types/auth-user.type';
import { DesignCfService } from './design-cf.service';
import { CreateDesignCfDto } from './dto/create-design-cf.dto';
import { UpdateDesignCfDto } from './dto/update-design-cf.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image

@Controller('design-cf')
export class DesignCfController {
  constructor(private readonly designCfService: DesignCfService) {}

  @Get()
  async listAll() {
    return this.designCfService.listAll();
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.designCfService.getById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 3 },
        { name: 'images[]', maxCount: 3 },
      ],
      {
        storage: memoryStorage(),
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
  async create(
    @Body() dto: CreateDesignCfDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      'images[]'?: Express.Multer.File[];
    },
  ) {
    const uploadedFiles = [
      ...(files?.images ?? []),
      ...(files?.['images[]'] ?? []),
    ];
    if (uploadedFiles.some((file) => file.size === 0)) {
      throw new BadRequestException('One or more uploaded images are empty');
    }
    return this.designCfService.create(dto, req.user.id, uploadedFiles);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 3 },
        { name: 'images[]', maxCount: 3 },
      ],
      {
        storage: memoryStorage(),
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignCfDto,
    @UploadedFiles()
    files?: {
      images?: Express.Multer.File[];
      'images[]'?: Express.Multer.File[];
    },
  ) {
    const uploadedFiles = [
      ...(files?.images ?? []),
      ...(files?.['images[]'] ?? []),
    ];
    if (uploadedFiles.some((file) => file.size === 0)) {
      throw new BadRequestException('One or more uploaded images are empty');
    }
    return this.designCfService.update(id, dto, uploadedFiles);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.designCfService.remove(id);
  }
}
