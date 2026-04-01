import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Create a new user (called by Admin)
   */
  async create(createUserDto: CreateUserDto, adminId: string): Promise<User> {
    const { email, password, ...rest } = createUserDto;

    // 1. Check if user already exists
    const existingUser = await this.findOneByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Hash password (default to 'Welcome@123' if not provided)
    const rawPassword = password || 'Welcome@123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 3. Get the Admin entity for the relationship
    const admin = await this.findOne(adminId);

    // 4. Create new user entity
    const newUser = this.usersRepository.create({
      ...rest,
      email,
      passwordHash,
      createdBy: admin as User, // Cast to avoid overload ambiguity
    });

    // 5. Save and return
    const savedUser = await this.usersRepository.save(newUser);
    
    // Remove sensitive data before returning
    const { passwordHash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword as User;
  }

  /**
   * Update a user's details (called by Admin)
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Find the user to update
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    // Merge the new data into the existing user object
    Object.assign(user, updateUserDto);

    // Save and return the updated user
    const savedUser = await this.usersRepository.save(user);
    const { passwordHash, ...result } = savedUser;
    return result as User;
  }

  /**
   * Deactivate a user (soft delete)
   */
  async deactivate(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    user.isActive = false;
    await this.usersRepository.save(user);
    return { message: `User with ID '${id}' has been deactivated` };
  }

  /**
   * Find all users
   */
  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  /**
   * Find a single user by their ID
   */
  findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * Find a single user by their email
   */
  findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Remove a user by ID
   */
  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  /**
   * Find a single user by their password reset token
   */
  findOneByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { resetPasswordToken: token } });
  }

  /**
   * Save a user entity
   */
  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
