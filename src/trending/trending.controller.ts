import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/dto/create-user.dto';
import { TrendingService } from './trending.service';
import { CreateTrendingEntryDto } from './dto/create-trending-entry.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  async listAll() {
    return this.trendingService.listAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
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
    }),
  )
  async create(
    @Body() dto: CreateTrendingEntryDto,
    @Req() req: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (image && image.size === 0) {
      throw new BadRequestException('Uploaded image is empty');
    }
    return this.trendingService.create(dto, req.user.id, image);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trendingService.remove(id);
  }
}
