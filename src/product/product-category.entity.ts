import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Column,
} from 'typeorm';
import { Product } from './product.entity';
import { Category } from '../category/category.entity';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  @Index()
  productId: string;

  @Column({ name: 'category_id', type: 'varchar', length: 36 })
  @Index()
  categoryId: string;

  @ManyToOne(() => Product, (product) => product.productCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Category, (category) => category.productCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
