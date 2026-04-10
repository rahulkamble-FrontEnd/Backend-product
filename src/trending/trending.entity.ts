import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('trending')
export class Trending {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ name: 'style_tag', type: 'varchar', length: 100, nullable: true })
  styleTag: string | null;

  @Column({ name: 's3_key', type: 'varchar', length: 500, nullable: false })
  s3Key: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  caption: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
