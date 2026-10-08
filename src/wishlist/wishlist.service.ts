import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { Wishlist } from './wishlist.entity';

const WISHLIST_ITEM_LIMIT = 25;

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async add(customerId: string, dto: AddWishlistItemDto): Promise<Wishlist> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.wishlistRepository.findOne({
      where: { customerId, productId: dto.productId },
    });
    if (existing) return existing;

    const savedCount = await this.wishlistRepository.count({
      where: { customerId },
    });
    if (savedCount >= WISHLIST_ITEM_LIMIT) {
      throw new BadRequestException('You can wishlist only 25 products.');
    }

    try {
      const created = this.wishlistRepository.create({
        customerId,
        productId: dto.productId,
      });
      return await this.wishlistRepository.save(created);
    } catch (error) {
      if (this.isDuplicate(error)) {
        const saved = await this.wishlistRepository.findOne({
          where: { customerId, productId: dto.productId },
        });
        if (saved) return saved;
      }
      throw error;
    }
  }

  async list(customerId: string): Promise<Wishlist[]> {
    return this.wishlistRepository
      .createQueryBuilder('wishlist')
      .leftJoinAndSelect('wishlist.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('wishlist.customerId = :customerId', { customerId })
      .orderBy('wishlist.createdAt', 'DESC')
      .getMany();
  }

  async removeByProduct(
    customerId: string,
    productId: string,
  ): Promise<{ message: string }> {
    const item = await this.wishlistRepository.findOne({
      where: { customerId, productId },
    });
    if (!item) {
      return { message: 'Removed from wishlist.' };
    }
    await this.wishlistRepository.remove(item);
    return { message: 'Removed from wishlist.' };
  }

  private isDuplicate(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'errno' in error.driverError &&
      (error.driverError as { errno?: number }).errno === 1062
    );
  }
}
