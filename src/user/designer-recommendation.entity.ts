import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from '../product/product.entity';

@Entity('designer_recommendations')
export class DesignerRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'designer_id', type: 'varchar', length: 36 })
  @Index()
  designerId: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  @Index()
  customerId: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  @Index()
  productId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'designer_id' })
  designer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
