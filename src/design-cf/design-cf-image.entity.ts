import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DesignCf } from './design-cf.entity';

@Entity('design_cf_images')
export class DesignCfImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'design_id', type: 'char', length: 36 })
  designId: string;

  @ManyToOne(() => DesignCf, (design) => design.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: DesignCf;

  @Column({ name: 's3_key', type: 'varchar', length: 500, nullable: false })
  s3Key: string;

  @Column({ name: 'display_order', type: 'int', default: 1 })
  displayOrder: number;
}
