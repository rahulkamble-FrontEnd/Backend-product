import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from '../product/product.entity';

@Entity('designer_notes')
export class DesignerNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'designer_id', type: 'varchar', length: 36 })
  @Index()
  designerId: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  @Index()
  customerId: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36, nullable: true })
  @Index()
  productId: string | null;

  @Column({ type: 'text', nullable: false })
  note: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'designer_id' })
  designer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;
}
