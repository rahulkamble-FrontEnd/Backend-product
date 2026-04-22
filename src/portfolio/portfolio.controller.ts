import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
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
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioEntryDto } from './dto/create-portfolio-entry.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async listAll(@Query('category') category?: string) {
    return this.portfolioService.listAll(category);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'images[]', maxCount: 10 },
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
    @Body() dto: CreatePortfolioEntryDto,
    @Req() req: any,
    @UploadedFiles()
    files?: { images?: Express.Multer.File[]; 'images[]'?: Express.Multer.File[] },
  ) {
    const uploadedFiles = [...(files?.images ?? []), ...(files?.['images[]'] ?? [])];
    const emptyFile = uploadedFiles.find((file) => file.size === 0);
    if (emptyFile) {
      throw new BadRequestException(`Uploaded image "${emptyFile.originalname}" is empty`);
    }
    return this.portfolioService.createEntry(dto, req.user.id, uploadedFiles);
  }
}
