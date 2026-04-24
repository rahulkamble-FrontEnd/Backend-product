import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shortlist } from './shortlist.entity';
import { Product } from '../product/product.entity';
import { AddShortlistItemDto } from './dto/add-shortlist-item.dto';
import { User } from '../user/user.entity';
import { Notification } from '../notification/notification.entity';
import { DesignerNote } from '../user/designer-note.entity';
import { DesignerRecommendation } from '../user/designer-recommendation.entity';

export type ShortlistListItem = Shortlist & {
  recommendations: DesignerRecommendation[];
  designerReplyNote: string | null;
  designerReplyUpdatedAt: Date | null;
  sample_status: string;
  sample_requested: boolean;
  sample_requested_at: Date | null;
  customer_note: string | null;
  designer_reply_note: string | null;
  designer_reply_updated_at: Date | null;
};

@Injectable()
export class ShortlistApiService {
  constructor(
    @InjectRepository(Shortlist)
    private readonly shortlistRepository: Repository<Shortlist>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(DesignerNote)
    private readonly designerNotesRepository: Repository<DesignerNote>,
    @InjectRepository(DesignerRecommendation)
    private readonly designerRecommendationsRepository: Repository<DesignerRecommendation>,
  ) {}

  async create(
    customerId: string,
    dto: AddShortlistItemDto,
  ): Promise<Shortlist> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.shortlistRepository.findOne({
      where: {
        customerId,
        productId: dto.productId,
      },
    });

    if (existing) {
      return existing;
    }

    const shortlist = this.shortlistRepository.create({
      customerId,
      productId: dto.productId,
      customerNote: dto.customerNote?.trim() || null,
    });

    return this.shortlistRepository.save(shortlist);
  }

  async requestSample(
    shortlistId: string,
    customerId: string,
  ): Promise<Shortlist> {
    const shortlist = await this.shortlistRepository.findOne({
      where: { id: shortlistId },
    });

    if (!shortlist) {
      throw new NotFoundException('Shortlist item not found');
    }

    if (shortlist.customerId !== customerId) {
      throw new ForbiddenException(
        'You can only request a sample for your own shortlist item',
      );
    }

    shortlist.sampleRequested = true;
    shortlist.sampleRequestedAt = shortlist.sampleRequestedAt ?? new Date();
    shortlist.sampleStatus = 'pending';

    const savedShortlist = await this.shortlistRepository.save(shortlist);

    const customer = await this.userRepository.findOne({
      where: { id: customerId },
      relations: ['assignedDesigner'],
    });

    if (customer?.assignedDesigner?.id) {
      const notification = this.notificationRepository.create({
        userId: customer.assignedDesigner.id,
        type: 'sample_requested',
        message: `${customer.name} requested a sample for shortlist item ${savedShortlist.id}`,
        link: `/shortlist/${savedShortlist.id}`,
      });

      await this.notificationRepository.save(notification);
    }

    return savedShortlist;
  }

  async list(customerId: string): Promise<ShortlistListItem[]> {
    const shortlistItems = await this.shortlistRepository
      .createQueryBuilder('shortlist')
      .leftJoinAndSelect('shortlist.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('shortlist.customerId = :customerId', { customerId })
      .orderBy('shortlist.createdAt', 'DESC')
      .getMany();

    const notes = await this.designerNotesRepository
      .createQueryBuilder('designerNote')
      .where('designerNote.customerId = :customerId', { customerId })
      .andWhere('designerNote.productId IS NOT NULL')
      .orderBy('designerNote.updatedAt', 'DESC')
      .getMany();

    const recommendations = await this.designerRecommendationsRepository
      .createQueryBuilder('designerRecommendation')
      .leftJoinAndSelect('designerRecommendation.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('designerRecommendation.customerId = :customerId', { customerId })
      .orderBy('designerRecommendation.createdAt', 'DESC')
      .getMany();

    const latestNoteByProduct = new Map<string, DesignerNote>();
    for (const note of notes) {
      if (!note.productId || latestNoteByProduct.has(note.productId)) {
        continue;
      }
      latestNoteByProduct.set(note.productId, note);
    }

    const recommendationsByProduct = recommendations.reduce<
      Record<string, DesignerRecommendation[]>
    >((acc, recommendation) => {
      const recommendationGroupKey =
        recommendation.shortlistedProductId || recommendation.productId;
      if (!acc[recommendationGroupKey]) {
        acc[recommendationGroupKey] = [];
      }
      acc[recommendationGroupKey].push(recommendation);
      return acc;
    }, {});

    return shortlistItems.map((shortlist) => {
      const latestDesignerNote =
        latestNoteByProduct.get(shortlist.productId) ?? null;

      return {
        ...shortlist,
        recommendations: recommendationsByProduct[shortlist.productId] ?? [],
        designerReplyNote: latestDesignerNote?.note ?? null,
        designerReplyUpdatedAt: latestDesignerNote?.updatedAt ?? null,
        sample_status: shortlist.sampleStatus,
        sample_requested: shortlist.sampleRequested,
        sample_requested_at: shortlist.sampleRequestedAt,
        customer_note: shortlist.customerNote,
        designer_reply_note: latestDesignerNote?.note ?? null,
        designer_reply_updated_at: latestDesignerNote?.updatedAt ?? null,
      };
    });
  }

  async updateNote(
    shortlistId: string,
    customerId: string,
    customerNote: string,
  ): Promise<Shortlist> {
    const shortlist = await this.shortlistRepository.findOne({
      where: { id: shortlistId },
    });

    if (!shortlist) {
      throw new NotFoundException('Shortlist item not found');
    }

    if (shortlist.customerId !== customerId) {
      throw new ForbiddenException(
        'You can only update the note for your own shortlist item',
      );
    }

    shortlist.customerNote = customerNote.trim();
    return this.shortlistRepository.save(shortlist);
  }

  async remove(
    shortlistId: string,
    customerId: string,
  ): Promise<{ message: string }> {
    const shortlist = await this.shortlistRepository.findOne({
      where: { id: shortlistId },
    });

    if (!shortlist) {
      throw new NotFoundException('Shortlist item not found');
    }

    if (shortlist.customerId !== customerId) {
      throw new ForbiddenException(
        'You can only remove your own shortlist item',
      );
    }

    await this.shortlistRepository.delete({ id: shortlistId });
    return { message: 'Removed from shortlist' };
  }
}
