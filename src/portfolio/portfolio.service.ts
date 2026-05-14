import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { Portfolio } from './portfolio.entity';
import { PortfolioImage } from './portfolio-image.entity';
import { CreatePortfolioEntryDto } from './dto/create-portfolio-entry.dto';
import { UpdatePortfolioEntryDto } from './dto/update-portfolio-entry.dto';
import { S3Service } from '../common/services/s3.service';
import { User } from '../user/user.entity';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioImage)
    private readonly portfolioImageRepository: Repository<PortfolioImage>,
    private readonly s3Service: S3Service,
  ) {}

  private async serializePublicEntry(entry: Portfolio): Promise<{
    id: string;
    title: string;
    roomType: string | null;
    description: string | null;
    category: string | null;
    createdAt: Date;
    images: Array<{
      id: string;
      s3Key: string;
      url: string;
      displayOrder: number;
    }>;
  }> {
    return {
      id: entry.id,
      title: entry.title,
      roomType: entry.roomType,
      description: entry.description,
      category: entry.category,
      createdAt: entry.createdAt,
      images: await Promise.all(
        [...(entry.images ?? [])]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(async (img) => ({
            id: img.id,
            s3Key: img.s3Key,
            url: await this.s3Service.getSignedObjectUrl(img.s3Key),
            displayOrder: img.displayOrder,
          })),
      ),
    };
  }

  async listAll(category?: string): Promise<unknown[]> {
    const normalizedCategory = category?.trim();
    const entries = await this.portfolioRepository.find({
      where: normalizedCategory ? { category: normalizedCategory } : undefined,
      relations: {
        images: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return Promise.all(
      entries.map((entry) => this.serializePublicEntry(entry)),
    );
  }

  async createEntry(
    dto: CreatePortfolioEntryDto,
    userId: string,
    uploadedFiles: Express.Multer.File[] = [],
  ): Promise<{ portfolio: Portfolio; images: PortfolioImage[] }> {
    const portfolio = this.portfolioRepository.create({
      title: dto.title,
      roomType: dto.roomType ?? null,
      description: dto.description ?? null,
      category: dto.category?.trim() ? dto.category.trim() : null,
      createdBy: { id: userId } as User,
    });
    const savedPortfolio = await this.portfolioRepository.save(portfolio);

    const manualImages = (dto.images ?? []).map((image, index) =>
      this.portfolioImageRepository.create({
        portfolioId: savedPortfolio.id,
        s3Key: image.s3Key,
        displayOrder: image.displayOrder ?? index + 1,
      }),
    );

    const maxManualDisplayOrder = manualImages.reduce(
      (max, image) => Math.max(max, image.displayOrder ?? 0),
      0,
    );

    const uploadedImageRecords: PortfolioImage[] = [];
    for (const [index, file] of uploadedFiles.entries()) {
      const fileExt = extname(file.originalname).toLowerCase();
      const s3Key = `portfolio/${savedPortfolio.id}/${uuidv4()}${fileExt}`;
      const uploadedKey = await this.s3Service.uploadFile(
        s3Key,
        file.buffer,
        file.mimetype,
      );

      uploadedImageRecords.push(
        this.portfolioImageRepository.create({
          portfolioId: savedPortfolio.id,
          s3Key: uploadedKey,
          displayOrder: maxManualDisplayOrder + index + 1,
        }),
      );
    }

    const images = [...manualImages, ...uploadedImageRecords];

    const savedImages =
      images.length > 0 ? await this.portfolioImageRepository.save(images) : [];

    return {
      portfolio: savedPortfolio,
      images: savedImages,
    };
  }

  async updateEntry(
    id: string,
    dto: UpdatePortfolioEntryDto,
  ): Promise<{
    id: string;
    title: string;
    roomType: string | null;
    description: string | null;
    category: string | null;
    createdAt: Date;
    images: Array<{
      id: string;
      s3Key: string;
      url: string;
      displayOrder: number;
    }>;
  }> {
    const hasField =
      dto.title !== undefined ||
      dto.roomType !== undefined ||
      dto.description !== undefined ||
      dto.category !== undefined;
    if (!hasField) {
      throw new BadRequestException('At least one field is required to update');
    }

    const entry = await this.portfolioRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!entry) {
      throw new NotFoundException(`Portfolio with id "${id}" not found`);
    }

    if (dto.title !== undefined) {
      const t = dto.title?.trim();
      if (!t) {
        throw new BadRequestException('Title cannot be empty');
      }
      entry.title = t;
    }
    if (dto.roomType !== undefined) {
      const r = dto.roomType?.trim();
      entry.roomType = r || null;
    }
    if (dto.description !== undefined) {
      entry.description = dto.description?.trim()
        ? dto.description.trim()
        : null;
    }
    if (dto.category !== undefined) {
      const c = dto.category?.trim();
      entry.category = c || null;
    }

    await this.portfolioRepository.save(entry);

    const reloaded = await this.portfolioRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!reloaded) {
      throw new NotFoundException(`Portfolio with id "${id}" not found`);
    }
    return this.serializePublicEntry(reloaded);
  }

  async removeEntry(id: string): Promise<{ message: string }> {
    const entry = await this.portfolioRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!entry) {
      throw new NotFoundException(`Portfolio with id "${id}" not found`);
    }

    for (const img of entry.images ?? []) {
      const key = img.s3Key?.trim();
      if (!key) continue;
      try {
        await this.s3Service.deleteFile(key);
      } catch {
        /* best-effort: still remove DB row */
      }
    }

    await this.portfolioRepository.delete({ id });
    return { message: `Portfolio "${id}" deleted successfully` };
  }
}
