import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { DesignCf } from './design-cf.entity';
import { DesignCfImage } from './design-cf-image.entity';
import { CreateDesignCfDto } from './dto/create-design-cf.dto';
import { UpdateDesignCfDto } from './dto/update-design-cf.dto';
import { S3Service } from '../common/services/s3.service';
import { User } from '../user/user.entity';

@Injectable()
export class DesignCfService implements OnModuleInit {
  private readonly logger = new Logger(DesignCfService.name);

  constructor(
    @InjectRepository(DesignCf)
    private readonly designRepository: Repository<DesignCf>,
    @InjectRepository(DesignCfImage)
    private readonly designImageRepository: Repository<DesignCfImage>,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS \`design_cf\` (
        \`id\` varchar(36) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_design_cf_created_by\` (\`created_by\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS \`design_cf_images\` (
        \`id\` varchar(36) NOT NULL,
        \`design_id\` varchar(36) NOT NULL,
        \`s3_key\` varchar(500) NOT NULL,
        \`display_order\` int NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_design_cf_images_design_id\` (\`design_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    this.logger.log('Ensured design_cf tables exist');
  }

  async listAll(): Promise<unknown[]> {
    const entries = await this.designRepository.find({
      relations: { images: true },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      entries.map(async (entry) => {
        const images = await Promise.all(
          [...(entry.images ?? [])]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(async (image) => ({
              id: image.id,
              s3Key: image.s3Key,
              displayOrder: image.displayOrder,
              imageUrl: await this.s3Service.getSignedObjectUrl(image.s3Key),
            })),
        );

        return {
          id: entry.id,
          title: entry.title,
          description: entry.description,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          imageCount: images.length,
          coverImageUrl: images[0]?.imageUrl ?? null,
          images,
        };
      }),
    );
  }

  async getById(id: string): Promise<unknown> {
    const entry = await this.designRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!entry) {
      throw new NotFoundException(`Design CF entry "${id}" not found`);
    }

    const images = await Promise.all(
      [...(entry.images ?? [])]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(async (image) => ({
          id: image.id,
          s3Key: image.s3Key,
          displayOrder: image.displayOrder,
          imageUrl: await this.s3Service.getSignedObjectUrl(image.s3Key),
        })),
    );

    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      imageCount: images.length,
      coverImageUrl: images[0]?.imageUrl ?? null,
      images,
    };
  }

  async create(
    dto: CreateDesignCfDto,
    userId: string,
    uploadedFiles: Express.Multer.File[],
  ): Promise<unknown> {
    if (!Array.isArray(uploadedFiles) || uploadedFiles.length < 1) {
      throw new BadRequestException('At least 1 image is required');
    }
    if (uploadedFiles.length > 3) {
      throw new BadRequestException('Maximum 3 images are allowed');
    }

    const design = this.designRepository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      createdBy: { id: userId } as User,
    });
    const savedDesign = await this.designRepository.save(design);

    const imageEntities: DesignCfImage[] = [];
    for (const [index, file] of uploadedFiles.entries()) {
      const fileExt = extname(file.originalname).toLowerCase();
      const s3Key = `design-cf/${savedDesign.id}/${uuidv4()}${fileExt}`;
      const uploadedKey = await this.s3Service.uploadFile(
        s3Key,
        file.buffer,
        file.mimetype,
      );
      imageEntities.push(
        this.designImageRepository.create({
          designId: savedDesign.id,
          s3Key: uploadedKey,
          displayOrder: index + 1,
        }),
      );
    }

    await this.designImageRepository.save(imageEntities);
    return this.getById(savedDesign.id);
  }

  async update(
    id: string,
    dto: UpdateDesignCfDto,
    uploadedFiles: Express.Multer.File[] = [],
  ): Promise<unknown> {
    const entry = await this.designRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!entry) {
      throw new NotFoundException(`Design CF entry "${id}" not found`);
    }

    const title = dto.title?.trim();
    if (typeof title === 'string' && title.length > 0) {
      entry.title = title;
    }
    if (typeof dto.description === 'string') {
      entry.description = dto.description.trim() || null;
    }
    await this.designRepository.save(entry);

    if (uploadedFiles.length > 0) {
      if (uploadedFiles.length < 1 || uploadedFiles.length > 3) {
        throw new BadRequestException(
          'When updating images, upload 1 to 3 images',
        );
      }

      for (const existingImage of entry.images ?? []) {
        await this.s3Service.deleteFile(existingImage.s3Key);
      }
      await this.designImageRepository.delete({ designId: entry.id });

      const newImageEntities: DesignCfImage[] = [];
      for (const [index, file] of uploadedFiles.entries()) {
        const fileExt = extname(file.originalname).toLowerCase();
        const s3Key = `design-cf/${entry.id}/${uuidv4()}${fileExt}`;
        const uploadedKey = await this.s3Service.uploadFile(
          s3Key,
          file.buffer,
          file.mimetype,
        );
        newImageEntities.push(
          this.designImageRepository.create({
            designId: entry.id,
            s3Key: uploadedKey,
            displayOrder: index + 1,
          }),
        );
      }
      await this.designImageRepository.save(newImageEntities);
    }

    return this.getById(entry.id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const entry = await this.designRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!entry) {
      throw new NotFoundException(`Design CF entry "${id}" not found`);
    }

    for (const image of entry.images ?? []) {
      await this.s3Service.deleteFile(image.s3Key);
    }
    await this.designRepository.delete({ id });

    return { message: `Design CF entry "${id}" removed successfully` };
  }
}
