import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryMenuItem } from './category.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/dto/create-user.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { OptionalAuthenticatedRequest } from '../auth/types/auth-user.type';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('includeSubcategories') includeSubcategories?: string,
  ): Promise<Category[]> {
    const shouldIncludeSubcategories = includeSubcategories === 'true';
    return this.categoryService.findAll(type, shouldIncludeSubcategories);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('menu')
  async findMenu(
    @Query('type') type?: string,
    @Query('productLimit') productLimit?: string,
    @Query('includeChildren') includeChildren?: string,
    @Req() req?: OptionalAuthenticatedRequest,
  ): Promise<CategoryMenuItem[]> {
    const parsedProductLimit = Number.parseInt(productLimit ?? '', 10);
    const safeProductLimit = Number.isNaN(parsedProductLimit)
      ? 8
      : parsedProductLimit;
    const shouldIncludeChildren =
      includeChildren === undefined ? true : includeChildren !== 'false';
    return this.categoryService.findMenu(
      type,
      safeProductLimit,
      shouldIncludeChildren,
      req?.user?.role,
    );
  }

  @Get(':id/subcategories')
  async findSubcategories(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Category[]> {
    return this.categoryService.findSubcategories(id);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<Category | null> {
    return this.categoryService.findBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/subcategories')
  async createSubcategory(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.createSubcategory(
      categoryId,
      createCategoryDto,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category | null> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':categoryId/subcategories/:subCategoryId')
  async updateSubcategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Param('subCategoryId', ParseUUIDPipe) subCategoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category | null> {
    return this.categoryService.updateSubcategory(
      categoryId,
      subCategoryId,
      updateCategoryDto,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.categoryService.deactivate(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':categoryId/subcategories/:subCategoryId')
  async removeSubcategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Param('subCategoryId', ParseUUIDPipe) subCategoryId: string,
  ): Promise<{ message: string }> {
    return this.categoryService.deactivateSubcategory(
      categoryId,
      subCategoryId,
    );
  }
}
