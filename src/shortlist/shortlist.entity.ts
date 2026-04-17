import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';

@Entity('shortlists')
export class Shortlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  @Index()
  customerId: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  @Index()
  productId: string;

  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote: string | null;

  @Column({ name: 'sample_requested', type: 'boolean', default: false })
  sampleRequested: boolean;

  @Column({ name: 'sample_requested_at', type: 'datetime', nullable: true })
  sampleRequestedAt: Date | null;

  @Column({
    name: 'sample_status',
    type: 'enum',
    enum: ['none', 'pending', 'ready', 'collected', 'not available'],
    default: 'none',
  })
  sampleStatus: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
