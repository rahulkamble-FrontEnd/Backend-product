import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { Portfolio } from './portfolio.entity';
import { PortfolioImage } from './portfolio-image.entity';
import { CreatePortfolioEntryDto } from './dto/create-portfolio-entry.dto';
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
      entries.map(async (entry) => ({
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
      })),
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
}
