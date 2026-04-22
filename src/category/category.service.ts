import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ProductCategory } from '../product/product-category.entity';
import { Product } from '../product/product.entity';

export interface CategoryMenuProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
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

  async findAll(type?: string): Promise<Category[]> {
    const where: any = { isActive: true };
    if (type) {
      where.type = type;
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

  async findMenu(
    type?: string,
    productLimit = 8,
    includeChildren = true,
  ): Promise<CategoryMenuItem[]> {
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
      .where('productCategory.category_id IN (:...categoryIds)', { categoryIds })
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
      products.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        brand: product.brand ?? null,
      });
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

    // Create unique slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newCategory = this.categoryRepository.create({
      name,
      type: type ?? 'material',
      slug,
      parent: parent_id ? { id: parent_id } : null,
    });

    return this.categoryRepository.save(newCategory);
  }

  async update(id: string, updateCategoryDto: any): Promise<Category | null> {
    const { name, type, parent_id } = updateCategoryDto;
    const updateData: any = {};

    if (name) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (type) updateData.type = type;
    if (parent_id !== undefined)
      updateData.parent = parent_id ? { id: parent_id } : null;

    await this.categoryRepository.update(id, updateData);
    return this.findOne(id);
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
}
