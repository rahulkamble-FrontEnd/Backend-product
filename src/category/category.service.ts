import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) { }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findOne(id: string): Promise<Category | null> {
    return this.categoryRepository.findOneBy({ id });
  }

  async create(createCategoryDto: any): Promise<Category> {
    const { name, type, parent_id } = createCategoryDto;

    // Create unique slug from name
    const slug = name.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newCategory = this.categoryRepository.create({
      name,
      type,
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
      updateData.slug = name.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (type) updateData.type = type;
    if (parent_id !== undefined) updateData.parent = parent_id ? { id: parent_id } : null;

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
