import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('delete_logs')
export class DeleteLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'entity_type', type: 'varchar', length: 40 })
  entityType: string;

  @Column({ type: 'varchar', length: 20 })
  action: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 36, nullable: true })
  entityId: string | null;

  @Column({ name: 'entity_name', type: 'varchar', length: 500, nullable: true })
  entityName: string | null;

  @Column({ name: 'parent_name', type: 'varchar', length: 500, nullable: true })
  parentName: string | null;

  @Column({
    name: 'deleted_by_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  deletedById: string | null;

  @Column({
    name: 'deleted_by_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  deletedByName: string | null;

  @Column({
    name: 'deleted_by_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  deletedByEmail: string | null;

  @Column({
    name: 'deleted_by_role',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  deletedByRole: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
