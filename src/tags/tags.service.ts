import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find({
      order: { name: 'ASC' },
    });
  }

  async create(createTagDto: CreateTagDto, userId: string): Promise<Tag> {
    const normalizedName = createTagDto.name.trim();
    const normalizedHexCode = createTagDto.hex_code.toUpperCase();

    const entity = this.tagRepository.create({
      name: normalizedName,
      slug: await this.generateUniqueSlug(normalizedName),
      hexCode: normalizedHexCode,
      createdBy: userId,
    });

    return this.tagRepository.save(entity);
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag with id "${id}" not found`);
    }

    if (updateTagDto.name !== undefined) {
      const nextName = updateTagDto.name.trim();
      if (!nextName) {
        throw new BadRequestException('Tag name cannot be empty');
      }
      tag.name = nextName;
      tag.slug = await this.generateUniqueSlug(nextName, id);
    }

    if (updateTagDto.hex_code !== undefined) {
      tag.hexCode = updateTagDto.hex_code.toUpperCase();
    }

    return this.tagRepository.save(tag);
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag with id "${id}" not found`);
    }

    await this.tagRepository.delete({ id });
    return { message: `Tag "${id}" deleted successfully` };
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
    input: string,
    skipId?: string,
  ): Promise<string> {
    const baseSlug = this.slugify(input);
    const fallbackSlug = 'tag';
    const initialSlug = baseSlug || fallbackSlug;

    const candidates = [initialSlug];
    for (let i = 2; i <= 50; i += 1) {
      candidates.push(`${initialSlug}-${i}`);
    }

    for (const candidate of candidates) {
      const existing = await this.tagRepository.findOne({
        where: { slug: candidate },
      });
      if (!existing || existing.id === skipId) {
        return candidate;
      }
    }

    throw new BadRequestException(
      'Could not generate a unique slug for this tag name',
    );
  }
}
