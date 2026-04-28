import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ProductCategory } from '../product/product-category.entity';
import { Product } from '../product/product.entity';
import { UserRole } from '../user/dto/create-user.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface CategoryMenuProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand?: string | null;
}

export interface CategoryMenuItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  displayOrder: number;
  productCount: number;
  products: CategoryMenuProduct[];
  children: CategoryMenuItem[];
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductCategory)
    private productCategoryRepository: Repository<ProductCategory>,
  ) {}

  async findAll(
    type?: string,
    includeSubcategories = false,
  ): Promise<Category[]> {
    const where: FindOptionsWhere<Category> = { isActive: true };
    if (type) {
      where.type = type;
    }
    if (!includeSubcategories) {
      where.parent = IsNull();
    }
    return this.categoryRepository.find({ where });
  }

  async findOne(id: string): Promise<Category | null> {
    return this.categoryRepository.findOneBy({ id });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: { slug, isActive: true },
      relations: ['children'],
    });
  }

  async findSubcategories(parentId: string): Promise<Category[]> {
    const parent = await this.categoryRepository.findOne({
      where: { id: parentId, isActive: true },
      relations: ['parent'],
    });
    if (!parent) {
      throw new NotFoundException(`Category with ID '${parentId}' not found`);
    }
    if (parent.parent) {
      throw new BadRequestException(
        `Category with ID '${parentId}' is already a sub-category`,
      );
    }

    return this.categoryRepository.find({
      where: {
        parent: { id: parentId },
        isActive: true,
      },
      relations: ['parent'],
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findMenu(
    type?: string,
    productLimit = 8,
    includeChildren = true,
    requesterRole?: string,
  ): Promise<CategoryMenuItem[]> {
    const hideBrand = requesterRole === UserRole.CUSTOMER;
    const safeProductLimit = Math.min(Math.max(productLimit, 1), 20);

    const categoriesQuery = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.is_active = :isActive', { isActive: true })
      .andWhere('category.parent_id IS NULL')
      .orderBy('category.display_order', 'ASC')
      .addOrderBy('category.name', 'ASC');

    if (type) {
      categoriesQuery.andWhere('category.type = :type', { type });
    }

    const rootCategories = await categoriesQuery.getMany();
    if (rootCategories.length === 0) {
      return [];
    }

    const rootCategoryIds = rootCategories.map((category) => category.id);
    const childCategories = includeChildren
      ? await this.categoryRepository
          .createQueryBuilder('category')
          .leftJoinAndSelect('category.parent', 'parent')
          .where('category.is_active = :isActive', { isActive: true })
          .andWhere('category.parent_id IN (:...rootCategoryIds)', {
            rootCategoryIds,
          })
          .orderBy('category.display_order', 'ASC')
          .addOrderBy('category.name', 'ASC')
          .getMany()
      : [];

    const allCategories = [...rootCategories, ...childCategories];
    const categoryIds = allCategories.map((category) => category.id);
    const rows = await this.productCategoryRepository
      .createQueryBuilder('productCategory')
      .leftJoinAndSelect('productCategory.product', 'product')
      .where('productCategory.category_id IN (:...categoryIds)', {
        categoryIds,
      })
      .andWhere('product.status = :activeStatus', { activeStatus: 'active' })
      .andWhere('product.deleted_at IS NULL')
      .orderBy('product.created_at', 'DESC')
      .getMany();

    const productsByCategory = new Map<string, CategoryMenuProduct[]>();
    const productIdsByCategory = new Map<string, Set<string>>();

    for (const row of rows) {
      const categoryId = row.categoryId;
      const product = row.product as Product | null;
      if (!categoryId || !product) {
        continue;
      }

      if (!productsByCategory.has(categoryId)) {
        productsByCategory.set(categoryId, []);
      }
      if (!productIdsByCategory.has(categoryId)) {
        productIdsByCategory.set(categoryId, new Set<string>());
      }

      const idsSet = productIdsByCategory.get(categoryId);
      const products = productsByCategory.get(categoryId);
      if (!idsSet || !products || idsSet.has(product.id)) {
        continue;
      }

      idsSet.add(product.id);
      const item: CategoryMenuProduct = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
      };
      if (!hideBrand) {
        item.brand = product.brand ?? null;
      }
      products.push(item);
    }

    const childrenByParentId = new Map<string, CategoryMenuItem[]>();

    for (const category of childCategories) {
      const parentId = category.parent?.id;
      if (!parentId) {
        continue;
      }
      if (!childrenByParentId.has(parentId)) {
        childrenByParentId.set(parentId, []);
      }
      const siblings = childrenByParentId.get(parentId);
      if (!siblings) {
        continue;
      }
      const products = productsByCategory.get(category.id) ?? [];
      siblings.push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        type: category.type,
        displayOrder: category.displayOrder,
        productCount: products.length,
        products: products.slice(0, safeProductLimit),
        children: [],
      });
    }

    return rootCategories.map((category) => {
      const products = productsByCategory.get(category.id) ?? [];
      const children = childrenByParentId.get(category.id) ?? [];
      const childProductCount = children.reduce(
        (sum, child) => sum + child.productCount,
        0,
      );
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        type: category.type,
        displayOrder: category.displayOrder,
        productCount: products.length + childProductCount,
        products: products.slice(0, safeProductLimit),
        children,
      };
    });
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, type, parent_id } = createCategoryDto;

    const slug = await this.generateUniqueSlug(name);

    if (parent_id) {
      const parent = await this.categoryRepository.findOne({
        where: { id: parent_id, isActive: true },
        relations: ['parent'],
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID '${parent_id}' not found`,
        );
      }
      if (parent.parent) {
        throw new BadRequestException(
          'Only one sub-category level is allowed. Parent must be a top-level category.',
        );
      }
    }

    const newCategory = this.categoryRepository.create({
      name,
      type: type ?? 'material',
      slug,
      parent: parent_id ? { id: parent_id } : null,
    });

    return this.categoryRepository.save(newCategory);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category | null> {
    const { name, type, parent_id } = updateCategoryDto;
    const updateData: Partial<Category> = {};

    if (name) {
      updateData.name = name;
      updateData.slug = await this.generateUniqueSlug(name, id);
    }

    if (type) updateData.type = type;
    if (parent_id !== undefined) {
      if (parent_id === id) {
        throw new BadRequestException('Category cannot be parent of itself');
      }
      if (parent_id) {
        const parent = await this.categoryRepository.findOne({
          where: { id: parent_id, isActive: true },
          relations: ['parent'],
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent category with ID '${parent_id}' not found`,
          );
        }
        if (parent.parent) {
          throw new BadRequestException(
            'Only one sub-category level is allowed. Parent must be a top-level category.',
          );
        }
      }
      updateData.parent = parent_id ? ({ id: parent_id } as Category) : null;
    }

    await this.categoryRepository.update(id, updateData);
    return this.findOne(id);
  }

  async createSubcategory(
    categoryId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.create({
      ...createCategoryDto,
      parent_id: categoryId,
    });
  }

  async updateSubcategory(
    categoryId: string,
    subCategoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category | null> {
    const subCategory = await this.categoryRepository.findOne({
      where: { id: subCategoryId, isActive: true },
      relations: ['parent'],
    });
    if (!subCategory) {
      throw new NotFoundException(
        `Sub-category with ID '${subCategoryId}' not found`,
      );
    }
    if (!subCategory.parent || subCategory.parent.id !== categoryId) {
      throw new BadRequestException(
        `Sub-category '${subCategoryId}' is not linked to category '${categoryId}'`,
      );
    }

    return this.update(subCategoryId, updateCategoryDto);
  }

  async deactivate(id: string): Promise<{ message: string }> {
    const category = await this.findOne(id);
    if (!category) {
      throw new Error(`Category with ID '${id}' not found`);
    }
    category.isActive = false;
    await this.categoryRepository.save(category);
    return { message: `Category with ID '${id}' has been deactivated` };
  }

  async deactivateSubcategory(
    categoryId: string,
    subCategoryId: string,
  ): Promise<{ message: string }> {
    const subCategory = await this.categoryRepository.findOne({
      where: { id: subCategoryId, isActive: true },
      relations: ['parent'],
    });
    if (!subCategory) {
      throw new NotFoundException(
        `Sub-category with ID '${subCategoryId}' not found`,
      );
    }
    if (!subCategory.parent || subCategory.parent.id !== categoryId) {
      throw new BadRequestException(
        `Sub-category '${subCategoryId}' is not linked to category '${categoryId}'`,
      );
    }

    return this.deactivate(subCategoryId);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(
    name: string,
    excludingCategoryId?: string,
  ): Promise<string> {
    const baseSlug = this.slugify(name);
    if (!baseSlug) {
      throw new BadRequestException('Category name results in an empty slug');
    }

    const existing = await this.categoryRepository.find({
      where: { slug: baseSlug },
      select: ['id', 'slug'],
    });
    const hasConflict = existing.some((row) => row.id !== excludingCategoryId);
    if (!hasConflict) {
      return baseSlug;
    }

    let counter = 2;
    while (counter <= 9999) {
      const candidate = `${baseSlug}-${counter}`;
      const match = await this.categoryRepository.findOne({
        where: { slug: candidate },
        select: ['id'],
      });
      if (!match || match.id === excludingCategoryId) {
        return candidate;
      }
      counter += 1;
    }

    throw new BadRequestException(
      'Unable to generate unique slug for category',
    );
  }
}
