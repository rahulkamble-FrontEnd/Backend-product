import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ProductCategory } from './product-category.entity';
import { ProductImage } from './product-image.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 270, unique: true, nullable: false })
  slug: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  sku: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  brand: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'material_type',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  materialType: string;

  @Column({ name: 'finish_type', type: 'varchar', length: 100, nullable: true })
  finishType: string;

  @Column({ name: 'color_name', type: 'varchar', length: 100, nullable: true })
  colorName: string;

  @Column({ name: 'color_hex', type: 'varchar', length: 7, nullable: true })
  colorHex: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  thickness: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dimensions: string;

  @Column({ name: 'performance_rating', type: 'tinyint', default: 0 })
  performanceRating: number;

  @Column({ name: 'durability_rating', type: 'tinyint', default: 0 })
  durabilityRating: number;

  @Column({ name: 'price_category', type: 'tinyint', default: 0 })
  priceCategory: number;

  @Column({ name: 'maintenance_rating', type: 'tinyint', default: 0 })
  maintenanceRating: number;

  @Column({ name: 'best_used_for', type: 'json', nullable: true })
  bestUsedFor: string[];

  @Column({ type: 'json', nullable: true })
  pros: string[];

  @Column({ type: 'json', nullable: true })
  cons: string[];

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  })
  status: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToMany(
    () => ProductCategory,
    (productCategory) => productCategory.product,
  )
  productCategories: ProductCategory[];

  @OneToMany(() => ProductImage, (productImage) => productImage.product)
  images: ProductImage[];
}
