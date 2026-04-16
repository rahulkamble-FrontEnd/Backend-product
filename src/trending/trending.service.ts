import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trending } from './trending.entity';
import { CreateTrendingEntryDto } from './dto/create-trending-entry.dto';
import { S3Service } from '../common/services/s3.service';

@Injectable()
export class TrendingService {
  constructor(
    @InjectRepository(Trending)
    private readonly trendingRepository: Repository<Trending>,
    private readonly s3Service: S3Service,
  ) {}

  async listAll(): Promise<unknown[]> {
    const entries = await this.trendingRepository.find({
      order: { createdAt: 'DESC' },
    });

    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      styleTag: entry.styleTag,
      s3Key: entry.s3Key,
      url: this.s3Service.getPublicUrl(entry.s3Key),
      caption: entry.caption,
      createdAt: entry.createdAt,
    }));
  }

  async create(
    dto: CreateTrendingEntryDto,
    userId: string,
  ): Promise<Trending> {
    const entity = this.trendingRepository.create({
      title: dto.title,
      styleTag: dto.styleTag ?? null,
      s3Key: dto.s3Key,
      caption: dto.caption ?? null,
      createdBy: { id: userId } as any,
    });

    return this.trendingRepository.save(entity);
  }

  async remove(id: string): Promise<{ message: string }> {
    const entry = await this.trendingRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Trending entry with id "${id}" not found`);
    }

    await this.trendingRepository.delete({ id });
    return { message: `Trending entry "${id}" removed successfully` };
  }
}
