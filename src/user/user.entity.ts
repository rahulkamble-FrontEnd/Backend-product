import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

/**
 * This class represents the 'users' table in our database.
 */
@Entity('users')
export class User {
  // Automatically generates a unique UUID for each user
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The unique email used for logging in
  @Column({ unique: true, nullable: false })
  email: string;

  // Stores the hashed password (never plain text!)
  @Column({ name: 'password_hash', nullable: false })
  passwordHash: string;

  @Column({ nullable: false, length: 150 })
  name: string;

  // User roles for permissions
  @Column({
    type: 'enum',
    enum: ['customer', 'designer', 'admin', 'blogadmin'],
    nullable: false,
  })
  role: string;

  @Column({ name: 'project_name', length: 200, nullable: true })
  projectName: string;

  // If false, the user is blocked and cannot log in
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Self-referencing relationship: which admin created this user
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  // Automatically tracks when the user was created
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Automatically tracks when the user was last updated
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
