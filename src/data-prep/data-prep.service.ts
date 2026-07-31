import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createRequire } from 'module';
import { join } from 'path';
import { Repository } from 'typeorm';
import { Category } from '../category/category.entity';

const requireFromHere = createRequire(__filename);

type ConvertCoreModule = {
  collectImagesFromZipBuffer: (zipBuffer: Buffer) => Array<{
    sourcePath: string | null;
    originalName: string;
    baseName: string;
    ext: string;
    buffer: Buffer | null;
  }>;
  convertVendorPack: (input: {
    xlsxBuffer: Buffer;
    images: Array<{
      sourcePath: string | null;
      originalName: string;
      baseName: string;
      ext: string;
      buffer: Buffer | null;
    }>;
    options: {
      categoryId: string;
      finishType?: string;
      status?: string;
      materialType?: string;
      description?: string;
      bookName?: string;
      brand?: string;
      dimensions?: string;
      packName?: string;
    };
  }) => {
    sheetName: string;
    vendorRows: number;
    imagesFound: number;
    matched: number;
    skippedNoImage: number;
    skippedEmptyGroup: number;
    skippedDuplicateSku: number;
    orphanImages: number;
    categoryId: string;
    uploadXlsxBuffer: Buffer;
    imagesZipBuffer: Buffer;
    reportCsv: string;
    packZipBuffer: Buffer;
  };
};

function loadConvertCore(): ConvertCoreModule {
  const candidates = [
    join(process.cwd(), 'scripts', 'data-prep', 'convert-core.js'),
    join(__dirname, '..', '..', 'scripts', 'data-prep', 'convert-core.js'),
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return requireFromHere(candidate) as ConvertCoreModule;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to load data-prep convert-core.js. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export type DataPrepOptions = {
  categoryId: string;
  finishType?: string;
  status?: string;
  materialType?: string;
  description?: string;
  bookName?: string;
  brand?: string;
  dimensions?: string;
  packName?: string;
};

export type DataPrepResult = {
  packZipBuffer: Buffer;
  packFileName: string;
  summary: {
    sheetName: string;
    vendorRows: number;
    imagesFound: number;
    matched: number;
    skippedNoImage: number;
    skippedEmptyGroup: number;
    skippedDuplicateSku: number;
    orphanImages: number;
    categoryId: string;
    categoryName: string;
  };
};

@Injectable()
export class DataPrepService {
  private convertCore: ConvertCoreModule | null = null;

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  private getConvertCore(): ConvertCoreModule {
    if (!this.convertCore) {
      try {
        this.convertCore = loadConvertCore();
      } catch (error: unknown) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Data prep converter is not available on this server',
        );
      }
    }
    return this.convertCore;
  }

  async convertFromUploads(
    xlsxFile: Express.Multer.File,
    imagesZipFile: Express.Multer.File,
    options: DataPrepOptions,
  ): Promise<DataPrepResult> {
    if (!xlsxFile?.buffer?.length) {
      throw new BadRequestException('Spreadsheet file is required');
    }
    if (!imagesZipFile?.buffer?.length) {
      throw new BadRequestException('Images ZIP is required');
    }

    const categoryId = String(options.categoryId || '').trim();
    if (!categoryId) {
      throw new BadRequestException('categoryId is required');
    }

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['parent'],
    });
    if (!category) {
      throw new NotFoundException(`Category '${categoryId}' not found`);
    }
    if (!category.parent) {
      throw new BadRequestException(
        'categoryId must be a sub-category (not a top-level category)',
      );
    }
    if (!category.isActive) {
      throw new BadRequestException('Selected category is inactive');
    }

    const convertCore = this.getConvertCore();
    const packName = this.sanitizePackName(options.packName || 'data-prep');
    const images = convertCore.collectImagesFromZipBuffer(imagesZipFile.buffer);

    if (!images.length) {
      throw new BadRequestException(
        'Images ZIP does not contain any .jpg/.jpeg/.png/.webp files',
      );
    }

    try {
      const result = convertCore.convertVendorPack({
        xlsxBuffer: xlsxFile.buffer,
        images,
        options: {
          categoryId: category.id,
          finishType: options.finishType || '',
          status: options.status || 'ACTIVE',
          materialType: options.materialType || '',
          description: options.description || '',
          bookName: options.bookName || '',
          brand: options.brand || '',
          dimensions: options.dimensions || '',
          packName,
        },
      });

      return {
        packZipBuffer: result.packZipBuffer,
        packFileName: `${packName}-pack.zip`,
        summary: {
          sheetName: result.sheetName,
          vendorRows: result.vendorRows,
          imagesFound: result.imagesFound,
          matched: result.matched,
          skippedNoImage: result.skippedNoImage,
          skippedEmptyGroup: result.skippedEmptyGroup,
          skippedDuplicateSku: result.skippedDuplicateSku,
          orphanImages: result.orphanImages,
          categoryId: category.id,
          categoryName: category.name,
        },
      };
    } catch (error: unknown) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to convert vendor pack',
      );
    }
  }

  private sanitizePackName(value: string): string {
    const cleaned = String(value || 'data-prep')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return cleaned || 'data-prep';
  }
}
