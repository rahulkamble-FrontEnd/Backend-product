import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { PortfolioImage } from './portfolio-image.entity';

@Entity('portfolio')
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ name: 'room_type', type: 'varchar', length: 100, nullable: true })
  roomType: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => PortfolioImage, (image) => image.portfolio)
  images: PortfolioImage[];
}
