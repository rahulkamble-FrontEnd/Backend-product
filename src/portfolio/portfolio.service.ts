import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from './portfolio.entity';
import { PortfolioImage } from './portfolio-image.entity';
import { CreatePortfolioEntryDto } from './dto/create-portfolio-entry.dto';
import { S3Service } from '../common/services/s3.service';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioImage)
    private readonly portfolioImageRepository: Repository<PortfolioImage>,
    private readonly s3Service: S3Service,
  ) {}

  async listAll(): Promise<unknown[]> {
    const entries = await this.portfolioRepository.find({
      relations: {
        images: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      roomType: entry.roomType,
      description: entry.description,
      createdAt: entry.createdAt,
      images: [...(entry.images ?? [])]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((img) => ({
          id: img.id,
          s3Key: img.s3Key,
          url: this.s3Service.getPublicUrl(img.s3Key),
          displayOrder: img.displayOrder,
        })),
    }));
  }

  async createEntry(dto: CreatePortfolioEntryDto, userId: string): Promise<{
    portfolio: Portfolio;
    images: PortfolioImage[];
  }> {
    const portfolio = this.portfolioRepository.create({
      title: dto.title,
      roomType: dto.roomType ?? null,
      description: dto.description ?? null,
      createdBy: { id: userId } as any,
    });
    const savedPortfolio = await this.portfolioRepository.save(portfolio);

    const images = (dto.images ?? []).map((image, index) =>
      this.portfolioImageRepository.create({
        portfolioId: savedPortfolio.id,
        s3Key: image.s3Key,
        displayOrder: image.displayOrder ?? index + 1,
      }),
    );

    const savedImages =
      images.length > 0
        ? await this.portfolioImageRepository.save(images)
        : [];

    return {
      portfolio: savedPortfolio,
      images: savedImages,
    };
  }
}
