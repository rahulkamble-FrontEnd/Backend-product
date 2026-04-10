import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Portfolio } from './portfolio.entity';

@Entity('portfolio_images')
export class PortfolioImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id', type: 'varchar', length: 36 })
  @Index()
  portfolioId: string;

  @Column({ name: 's3_key', type: 'varchar', length: 500, nullable: false })
  s3Key: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @ManyToOne(() => Portfolio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;
}
