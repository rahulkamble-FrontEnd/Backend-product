import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Category } from '../category/category.entity';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'varchar', length: 270, unique: true, nullable: false })
  slug: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @RelationId((blogPost: BlogPost) => blogPost.category)
  categoryId: string | null;

  @Column({
    name: 'featured_image_s3_key',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  featuredImageS3Key: string | null;

  @Column({
    name: 'featured_image_alt',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  featuredImageAlt: string | null;

  @Column({
    name: 'featured_image_title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  featuredImageTitle: string | null;

  @Column({
    name: 'meta_description',
    type: 'varchar',
    length: 320,
    nullable: true,
  })
  metaDescription: string | null;

  @Column({
    name: 'seo_keyword',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  seoKeyword: string | null;

  @Column({ type: 'longtext', nullable: false })
  body: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({
    type: 'enum',
    enum: ['draft', 'published'],
    default: 'draft',
  })
  status: string;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
