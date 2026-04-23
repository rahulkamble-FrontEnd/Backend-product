import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Tag } from '../tags/tag.entity';

@Entity('product_tags')
export class ProductTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  @Index()
  productId: string;

  @Column({ name: 'tag_id', type: 'varchar', length: 36 })
  @Index()
  tagId: string;

  @ManyToOne(() => Product, (product) => product.productTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
