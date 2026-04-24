import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'varchar', length: 270, unique: true, nullable: false })
  slug: string;

  @Column({
    name: 'category_tag',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  categoryTag: string | null;

  @Column({
    name: 'featured_image_s3_key',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  featuredImageS3Key: string | null;

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
