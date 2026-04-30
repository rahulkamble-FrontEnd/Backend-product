import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
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
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { PublishBlogPostDto } from './dto/publish-blog-post.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { CreateTrendingDto } from './dto/create-trending.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import type { AuthenticatedRequest } from '../auth/types/auth-user.type';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  async listPublished() {
    return this.blogService.listPublished();
  }

  @Get(':slug/relevant')
  async getRelevantBySlug(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    const safeLimit = Number.isNaN(parsedLimit) ? 3 : parsedLimit;
    return this.blogService.listRelevantBySlug(slug, safeLimit);
  }

  @Get(':slug')
  async getPublishedBySlug(@Param('slug') slug: string) {
    return this.blogService.getPublishedBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('featuredImage', {
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
  async createPost(
    @Body() dto: CreateBlogPostDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() featuredImage?: Express.Multer.File,
  ) {
    if (featuredImage && featuredImage.size === 0) {
      throw new BadRequestException('Uploaded featuredImage is empty');
    }
    return this.blogService.createDraft(dto, req.user.id, featuredImage);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Patch(':id/publish')
  async publishPost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() dto: PublishBlogPostDto,
  ) {
    return this.blogService.publish(postId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Put(':id')
  async updatePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogService.update(postId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Put(':id/publish')
  async togglePublished(@Param('id', ParseUUIDPipe) postId: string) {
    return this.blogService.togglePublished(postId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Delete(':id')
  async deletePost(@Param('id', ParseUUIDPipe) postId: string) {
    return this.blogService.remove(postId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Post('portfolio')
  async createPortfolio(
    @Body() dto: CreatePortfolioDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blogService.createPortfolio(dto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Post('trending')
  async createTrending(
    @Body() dto: CreateTrendingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blogService.createTrending(dto, req.user.id);
  }
}
