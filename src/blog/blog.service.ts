import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly s3Service: S3Service,
  ) {}

  private async attachAuthorSummary<T extends { author?: unknown } & BlogPost>(
    posts: T[],
  ): Promise<Array<T & { author: { id: string; name: string } | null }>> {
    if (!posts.length) return posts.map((post) => ({ ...post, author: null }));
    const authorIds = Array.from(
      new Set(
        posts
          .map((post) => post.author?.['id'] ?? null)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (!authorIds.length) {
      return posts.map((post) => ({ ...post, author: null }));
    }
    const authors = await this.userRepository.find({
      where: { id: In(authorIds) },
      select: ['id', 'name'],
    });
    const byId = new Map(authors.map((author) => [author.id, author]));
    return posts.map((post) => {
      const authorId = post.author?.['id'] ?? null;
      const author = authorId ? byId.get(authorId) : null;
      return {
        ...post,
        author: author ? { id: author.id, name: author.name } : null,
      };
    });
  }

  async listPublished(): Promise<
    Array<BlogPost & { author: { id: string; name: string } | null }>
  > {
    const now = new Date();
    const posts = await this.blogPostRepository
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.author', 'author')
      .where('blog.status = :status', { status: 'published' })
      .andWhere('(blog.publishedAt IS NULL OR blog.publishedAt <= :now)', {
        now,
      })
      .orderBy('blog.publishedAt', 'DESC')
      .addOrderBy('blog.createdAt', 'DESC')
      .getMany();
    return this.attachAuthorSummary(posts);
  }

  async getPublishedBySlug(
    slug: string,
  ): Promise<BlogPost & { author: { id: string; name: string } | null }> {
    const now = new Date();
    const post = await this.blogPostRepository.findOne({
      where: {
        slug,
        status: 'published',
      },
      relations: ['category', 'author'],
    });
    if (!post) {
      throw new NotFoundException(
        `Published blog post with slug "${slug}" not found`,
      );
    }
    if (post.publishedAt && post.publishedAt > now) {
      throw new NotFoundException(
        `Published blog post with slug "${slug}" not found`,
      );
    }
    const [enriched] = await this.attachAuthorSummary([post]);
    return enriched;
  }

  /**
   * Public post at /blog/{categorySlug}/{postSlug} — category must match the post.
   */
  async getPublishedByCategoryAndSlug(
    categorySlug: string,
    postSlug: string,
  ): Promise<BlogPost & { author: { id: string; name: string } | null }> {
    const now = new Date();
    const post = await this.blogPostRepository.findOne({
      where: { slug: postSlug, status: 'published' },
      relations: ['category', 'author'],
    });
    if (!post) {
      throw new NotFoundException(
        `Published blog post with slug "${postSlug}" not found`,
      );
    }
    if (post.publishedAt && post.publishedAt > now) {
      throw new NotFoundException(
        `Published blog post with slug "${postSlug}" not found`,
      );
    }
    if (!post.category) {
      throw new NotFoundException(
        `Blog "${postSlug}" has no category — use the legacy URL without category segment`,
      );
    }
    if (post.category.slug !== categorySlug) {
      throw new NotFoundException(
        `Blog not found at category "${categorySlug}"`,
      );
    }
    const [enriched] = await this.attachAuthorSummary([post]);
    return enriched;
  }

  async uploadBodyImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string; key: string }> {
    const fileExt = extname(file.originalname).toLowerCase();
    const s3Key = `products/blog/${userId}/body/${uuidv4()}${fileExt}`;
    const key = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype,
    );
    return { key, url: this.s3Service.getPublicUrl(key) };
  }

  /**
   * Returns whether a slug is free to use. When updating, pass excludePostId so the
   * current post's slug is still considered available.
   */
  async isSlugAvailable(
    slug: string,
    excludePostId?: string,
  ): Promise<{ available: boolean }> {
    const trimmed = slug?.trim() ?? '';
    if (!trimmed) {
      return { available: false };
    }
    const existing = await this.blogPostRepository.findOne({
      where: { slug: trimmed },
      select: ['id', 'slug'],
    });
    if (!existing) {
      return { available: true };
    }
    if (excludePostId && existing.id === excludePostId) {
      return { available: true };
    }
    return { available: false };
  }

  async createDraft(
    dto: CreateBlogPostDto,
    userId: string,
    featuredImage?: Express.Multer.File,
  ): Promise<BlogPost & { author: { id: string; name: string } | null }> {
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
      featuredImageAlt: dto.featuredImageAlt?.trim() ?? null,
      featuredImageTitle: dto.featuredImageTitle?.trim() ?? null,
      socialImageS3Key: dto.socialImageS3Key?.trim() ?? null,
      metaTitle: dto.metaTitle?.trim() ?? null,
      metaDescription: dto.metaDescription?.trim() ?? null,
      seoKeyword: dto.seoKeyword?.trim() ?? null,
      secondaryKeywords: dto.secondaryKeywords?.trim() ?? null,
      canonicalUrl: dto.canonicalUrl?.trim() ?? null,
      metaRobots: dto.metaRobots?.trim() ?? null,
      status: dto.status ?? 'draft',
      publishedAt:
        dto.status === 'published'
          ? dto.publishedAt
            ? new Date(dto.publishedAt)
            : new Date()
          : null,
      author: { id: userId } as User,
    });

    await this.blogPostRepository.save(entity);
    const saved = await this.blogPostRepository.findOne({
      where: { id: entity.id },
      relations: ['category', 'author'],
    });
    if (!saved) {
      throw new NotFoundException(`Blog post with id "${entity.id}" not found`);
    }
    const [enriched] = await this.attachAuthorSummary([saved]);
    return enriched;
  }

  async publish(
    postId: string,
    dto: PublishBlogPostDto,
  ): Promise<BlogPost & { author: { id: string; name: string } | null }> {
    const post = await this.blogPostRepository.findOne({
      where: { id: postId },
      relations: ['category'],
    });
    if (!post) {
      throw new NotFoundException(`Blog post with id "${postId}" not found`);
    }

    post.status = 'published';
    post.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
    await this.blogPostRepository.save(post);
    const saved = await this.blogPostRepository.findOne({
      where: { id: post.id },
      relations: ['category', 'author'],
    });
    if (!saved) {
      throw new NotFoundException(`Blog post with id "${post.id}" not found`);
    }
    const [enriched] = await this.attachAuthorSummary([saved]);
    return enriched;
  }

  async update(
    postId: string,
    dto: UpdateBlogPostDto,
  ): Promise<BlogPost & { author: { id: string; name: string } | null }> {
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
      if (existingSlug && existingSlug.id !== postId) {
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
    if (dto.featuredImageAlt !== undefined) {
      post.featuredImageAlt = dto.featuredImageAlt?.trim() ?? null;
    }
    if (dto.featuredImageTitle !== undefined) {
      post.featuredImageTitle = dto.featuredImageTitle?.trim() ?? null;
    }
    if (dto.socialImageS3Key !== undefined) {
      post.socialImageS3Key = dto.socialImageS3Key?.trim() ?? null;
    }
    if (dto.metaTitle !== undefined) {
      post.metaTitle = dto.metaTitle?.trim() ?? null;
    }
    if (dto.metaDescription !== undefined) {
      post.metaDescription = dto.metaDescription?.trim() ?? null;
    }
    if (dto.seoKeyword !== undefined) {
      post.seoKeyword = dto.seoKeyword?.trim() ?? null;
    }
    if (dto.secondaryKeywords !== undefined) {
      post.secondaryKeywords = dto.secondaryKeywords?.trim() ?? null;
    }
    if (dto.canonicalUrl !== undefined) {
      post.canonicalUrl = dto.canonicalUrl?.trim() ?? null;
    }
    if (dto.metaRobots !== undefined) {
      post.metaRobots = dto.metaRobots?.trim() ?? null;
    }
    if (dto.status !== undefined) {
      post.status = dto.status;
      if (dto.status === 'published') {
        post.publishedAt = dto.publishedAt
          ? new Date(dto.publishedAt)
          : (post.publishedAt ?? new Date());
      } else {
        post.publishedAt = null;
      }
    } else if (dto.publishedAt !== undefined && post.status === 'published') {
      post.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }

    await this.blogPostRepository.save(post);
    const saved = await this.blogPostRepository.findOne({
      where: { id: post.id },
      relations: ['category', 'author'],
    });
    if (!saved) {
      throw new NotFoundException(`Blog post with id "${post.id}" not found`);
    }
    const [enriched] = await this.attachAuthorSummary([saved]);
    return enriched;
  }

  async togglePublished(
    postId: string,
  ): Promise<BlogPost & { author: { id: string; name: string } | null }> {
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

    await this.blogPostRepository.save(post);
    const saved = await this.blogPostRepository.findOne({
      where: { id: post.id },
      relations: ['category', 'author'],
    });
    if (!saved) {
      throw new NotFoundException(`Blog post with id "${post.id}" not found`);
    }
    const [enriched] = await this.attachAuthorSummary([saved]);
    return enriched;
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

  async listRelevantBySlug(
    slug: string,
    limit = 3,
  ): Promise<
    Array<BlogPost & { author: { id: string; name: string } | null }>
  > {
    const now = new Date();
    const sourcePost = await this.blogPostRepository.findOne({
      where: { slug, status: 'published' },
      relations: ['category'],
    });
    if (!sourcePost) {
      throw new NotFoundException(
        `Published blog post with slug "${slug}" not found`,
      );
    }
    if (sourcePost.publishedAt && sourcePost.publishedAt > now) {
      throw new NotFoundException(
        `Published blog post with slug "${slug}" not found`,
      );
    }

    const sourceCategoryId = sourcePost.categoryId;
    if (!sourceCategoryId) {
      return [];
    }

    const related = await this.blogPostRepository
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.author', 'author')
      .where('blog.status = :status', { status: 'published' })
      .andWhere('(blog.publishedAt IS NULL OR blog.publishedAt <= :now)', {
        now,
      })
      .andWhere('blog.slug != :slug', { slug })
      .andWhere('blog.category_id = :categoryId', {
        categoryId: sourceCategoryId,
      })
      .orderBy('blog.publishedAt', 'DESC')
      .addOrderBy('blog.createdAt', 'DESC')
      .take(Math.min(Math.max(limit, 1), 12))
      .getMany();
    return this.attachAuthorSummary(related);
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
