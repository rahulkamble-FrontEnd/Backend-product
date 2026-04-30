import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { BlogPost } from './blog-post.entity';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { PublishBlogPostDto } from './dto/publish-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { Portfolio } from '../portfolio/portfolio.entity';
import { PortfolioImage } from '../portfolio/portfolio-image.entity';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { Trending } from '../trending/trending.entity';
import { CreateTrendingDto } from './dto/create-trending.dto';
import { S3Service } from '../common/services/s3.service';
import { User } from '../user/user.entity';
import { Category } from '../category/category.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioImage)
    private readonly portfolioImageRepository: Repository<PortfolioImage>,
    @InjectRepository(Trending)
    private readonly trendingRepository: Repository<Trending>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly s3Service: S3Service,
  ) {}

  async listPublished(): Promise<BlogPost[]> {
    return this.blogPostRepository.find({
      where: { status: 'published' },
      relations: ['category'],
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async getPublishedBySlug(slug: string): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({
      where: { slug, status: 'published' },
      relations: ['category'],
    });
    if (!post) {
      throw new NotFoundException(
        `Published blog post with slug "${slug}" not found`,
      );
    }
    return post;
  }

  async createDraft(
    dto: CreateBlogPostDto,
    userId: string,
    featuredImage?: Express.Multer.File,
  ): Promise<BlogPost> {
    const existingSlug = await this.blogPostRepository.findOne({
      where: { slug: dto.slug },
      select: ['id', 'slug'],
    });
    if (existingSlug) {
      throw new BadRequestException(`Slug "${dto.slug}" already exists`);
    }

    let featuredImageS3Key = dto.featuredImageS3Key ?? null;
    if (featuredImage) {
      const fileExt = extname(featuredImage.originalname).toLowerCase();
      // Keep blog uploads under a prefix that is already publicly readable in S3.
      const s3Key = `products/blog/${userId}/${uuidv4()}${fileExt}`;
      featuredImageS3Key = await this.s3Service.uploadFile(
        s3Key,
        featuredImage.buffer,
        featuredImage.mimetype,
      );
    }

    let category: Category | null = null;
    if (dto.categoryId) {
      category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId, isActive: true },
      });
      if (!category) {
        throw new BadRequestException(
          `Category "${dto.categoryId}" is invalid or inactive`,
        );
      }
    }

    const entity = this.blogPostRepository.create({
      title: dto.title,
      slug: dto.slug,
      body: dto.body,
      category,
      featuredImageS3Key,
      status: dto.status ?? 'draft',
      publishedAt: dto.status === 'published' ? new Date() : null,
      author: { id: userId } as User,
    });

    return this.blogPostRepository.save(entity);
  }

  async publish(postId: string, dto: PublishBlogPostDto): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({
      where: { id: postId },
      relations: ['category'],
    });
    if (!post) {
      throw new NotFoundException(`Blog post with id "${postId}" not found`);
    }

    post.status = 'published';
    post.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
    return this.blogPostRepository.save(post);
  }

  async update(postId: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Blog post with id "${postId}" not found`);
    }

    if (dto.slug && dto.slug !== post.slug) {
      const existingSlug = await this.blogPostRepository.findOne({
        where: { slug: dto.slug },
        select: ['id', 'slug'],
      });
      if (existingSlug) {
        throw new BadRequestException(`Slug "${dto.slug}" already exists`);
      }
    }

    if (dto.title !== undefined) post.title = dto.title;
    if (dto.slug !== undefined) post.slug = dto.slug;
    if (dto.body !== undefined) post.body = dto.body;
    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: dto.categoryId, isActive: true },
        });
        if (!category) {
          throw new BadRequestException(
            `Category "${dto.categoryId}" is invalid or inactive`,
          );
        }
        post.category = category;
      } else {
        post.category = null;
      }
    }
    if (dto.featuredImageS3Key !== undefined) {
      post.featuredImageS3Key = dto.featuredImageS3Key;
    }
    if (dto.status !== undefined) {
      post.status = dto.status;
      post.publishedAt =
        dto.status === 'published' ? (post.publishedAt ?? new Date()) : null;
    }

    return this.blogPostRepository.save(post);
  }

  async togglePublished(postId: string): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Blog post with id "${postId}" not found`);
    }

    if (post.status === 'published') {
      post.status = 'draft';
      post.publishedAt = null;
    } else {
      post.status = 'published';
      post.publishedAt = new Date();
    }

    return this.blogPostRepository.save(post);
  }

  async remove(postId: string): Promise<{ message: string }> {
    const post = await this.blogPostRepository.findOne({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException(`Blog post with id "${postId}" not found`);
    }

    await this.blogPostRepository.delete({ id: postId });
    return { message: `Blog post "${postId}" deleted successfully` };
  }

  async listRelevantBySlug(slug: string, limit = 3): Promise<BlogPost[]> {
    const sourcePost = await this.blogPostRepository.findOne({
      where: { slug, status: 'published' },
      relations: ['category'],
    });
    if (!sourcePost) {
      throw new NotFoundException(
        `Published blog post with slug "${slug}" not found`,
      );
    }

    const sourceCategoryId = sourcePost.categoryId;
    if (!sourceCategoryId) {
      return [];
    }

    return this.blogPostRepository
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .where('blog.status = :status', { status: 'published' })
      .andWhere('blog.slug != :slug', { slug })
      .andWhere('blog.category_id = :categoryId', {
        categoryId: sourceCategoryId,
      })
      .orderBy('blog.publishedAt', 'DESC')
      .addOrderBy('blog.createdAt', 'DESC')
      .take(Math.min(Math.max(limit, 1), 12))
      .getMany();
  }

  async createPortfolio(
    dto: CreatePortfolioDto,
    userId: string,
  ): Promise<{
    portfolio: Portfolio;
    images: PortfolioImage[];
  }> {
    const portfolio = this.portfolioRepository.create({
      title: dto.title,
      roomType: dto.roomType ?? null,
      description: dto.description ?? null,
      createdBy: { id: userId } as User,
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
      images.length > 0 ? await this.portfolioImageRepository.save(images) : [];

    return {
      portfolio: savedPortfolio,
      images: savedImages,
    };
  }

  async createTrending(
    dto: CreateTrendingDto,
    userId: string,
  ): Promise<Trending> {
    const entity = this.trendingRepository.create({
      title: dto.title,
      styleTag: dto.styleTag ?? null,
      s3Key: dto.s3Key,
      caption: dto.caption ?? null,
      createdBy: { id: userId } as User,
    });

    return this.trendingRepository.save(entity);
  }
}
