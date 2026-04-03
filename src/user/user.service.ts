import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
    const { assignedDesignerId, ...rest } = updateUserDto;

    // Find the user to update
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['assignedDesigner'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    // 1. Handle designer assignment if ID was provided
    if (assignedDesignerId !== undefined) {
      if (assignedDesignerId === null) {
        // Remove assignment
        user.assignedDesigner = null;
      } else {
        // Find and check if target is a designer
        const designer = await this.usersRepository.findOne({
          where: { id: assignedDesignerId, role: UserRole.DESIGNER },
        });
        if (!designer) {
          throw new NotFoundException(`Designer with ID '${assignedDesignerId}' not found`);
        }
        user.assignedDesigner = designer;
      }
    }

    // 2. Merge the other fields (email, name, role, etc.)
    Object.assign(user, rest);

    // 3. Save and return clean user object
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
   * Find all users, optionally filtered by role
   */
  async findAll(role?: string): Promise<User[]> {
    const where: any = {};
    if (role) {
      where.role = role;
    }
    const users = await this.usersRepository.find({
      where,
      relations: ['assignedDesigner'],
    });
    // Remove sensitive data from all returned users
    return users.map((user) => {
      const { passwordHash, resetPasswordToken, resetPasswordExpires, ...result } = user;
      return result as User;
    });
  }

  /**
   * Find a single user by their ID
   */
  findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['assignedDesigner'],
    });
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
