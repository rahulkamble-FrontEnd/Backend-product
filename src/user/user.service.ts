import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DesignerNote } from './designer-note.entity';
import { DesignerRecommendation } from './designer-recommendation.entity';
import { Shortlist } from '../shortlist/shortlist.entity';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(DesignerNote)
    private designerNotesRepository: Repository<DesignerNote>,
    @InjectRepository(DesignerRecommendation)
    private designerRecommendationsRepository: Repository<DesignerRecommendation>,
    @InjectRepository(Shortlist)
    private shortlistRepository: Repository<Shortlist>,
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
          throw new NotFoundException(
            `Designer with ID '${assignedDesignerId}' not found`,
          );
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
      const {
        passwordHash,
        resetPasswordToken,
        resetPasswordExpires,
        ...result
      } = user;
      return result as User;
    });
  }

  async findAssignedCustomers(designerId: string): Promise<User[]> {
    const customers = await this.usersRepository.find({
      where: {
        role: UserRole.CUSTOMER,
        assignedDesigner: { id: designerId } as any,
      },
      relations: ['assignedDesigner'],
    });

    return customers.map((user) => {
      const {
        passwordHash,
        resetPasswordToken,
        resetPasswordExpires,
        ...result
      } = user;
      return result as User;
    });
  }

  async getCustomerShortlistAndNotes(
    customerId: string,
    designerId: string,
    skipOwnershipCheck = false,
  ): Promise<{
    customer: User;
    shortlist: Shortlist[];
    notes: DesignerNote[];
  }> {
    const customer = await this.usersRepository.findOne({
      where: { id: customerId, role: UserRole.CUSTOMER },
      relations: ['assignedDesigner'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found`);
    }

    if (
      !skipOwnershipCheck &&
      customer.assignedDesigner?.id !== designerId
    ) {
      throw new ForbiddenException('This customer is not assigned to you');
    }

    const shortlist = await this.shortlistRepository
      .createQueryBuilder('shortlist')
      .leftJoinAndSelect('shortlist.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('shortlist.customerId = :customerId', { customerId })
      .orderBy('shortlist.createdAt', 'DESC')
      .getMany();

    const notes = await this.designerNotesRepository
      .createQueryBuilder('designerNote')
      .leftJoinAndSelect('designerNote.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('designerNote.customerId = :customerId', { customerId })
      .andWhere('designerNote.designerId = :designerId', { designerId })
      .orderBy('designerNote.updatedAt', 'DESC')
      .getMany();

    const {
      passwordHash,
      resetPasswordToken,
      resetPasswordExpires,
      ...customerWithoutSensitiveFields
    } = customer;

    return {
      customer: customerWithoutSensitiveFields as User,
      shortlist,
      notes,
    };
  }

  /**
   * Add a note for a customer by a designer
   */
  async addDesignerNote(
    designerId: string,
    customerId: string,
    note: string,
    productId?: string,
    isAdmin = false,
  ): Promise<DesignerNote> {
    const customer = await this.usersRepository.findOne({
      where: { id: customerId, role: UserRole.CUSTOMER },
      relations: ['assignedDesigner'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!isAdmin && customer.assignedDesigner?.id !== designerId) {
      throw new ForbiddenException('Customer is not assigned to you');
    }

    const designerNote = this.designerNotesRepository.create({
      designerId,
      customerId,
      note,
      productId: productId || null,
    });

    return this.designerNotesRepository.save(designerNote);
  }

  async updateDesignerNote(
    noteId: string,
    designerId: string,
    note: string,
    productId?: string,
    isAdmin = false,
  ): Promise<DesignerNote> {
    const existingNote = await this.designerNotesRepository.findOne({
      where: { id: noteId },
    });

    if (!existingNote) {
      throw new NotFoundException('Note not found');
    }

    if (!isAdmin && existingNote.designerId !== designerId) {
      throw new ForbiddenException('You can only update your own notes');
    }

    existingNote.note = note.trim();
    if (productId !== undefined) {
      existingNote.productId = productId || null;
    }

    return this.designerNotesRepository.save(existingNote);
  }

  /**
   * Recommend a product for a customer by a designer
   */
  async addDesignerRecommendation(
    designerId: string,
    customerId: string,
    productId: string,
    note?: string,
    isAdmin = false,
  ): Promise<DesignerRecommendation> {
    const customer = await this.usersRepository.findOne({
      where: { id: customerId, role: UserRole.CUSTOMER },
      relations: ['assignedDesigner'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!isAdmin && customer.assignedDesigner?.id !== designerId) {
      throw new ForbiddenException('Customer is not assigned to you');
    }

    const recommendation = this.designerRecommendationsRepository.create({
      designerId,
      customerId,
      productId,
      note: note || null,
    });

    return this.designerRecommendationsRepository.save(recommendation);
  }

  async updateSampleStatus(
    shortlistId: string,
    designerId: string,
    sampleStatus: 'none' | 'pending' | 'ready' | 'collected',
    isAdmin = false,
  ): Promise<Shortlist> {
    const shortlist = await this.shortlistRepository.findOne({
      where: { id: shortlistId },
    });

    if (!shortlist) {
      throw new NotFoundException('Shortlist item not found');
    }

    const customer = await this.usersRepository.findOne({
      where: { id: shortlist.customerId, role: UserRole.CUSTOMER },
      relations: ['assignedDesigner'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!isAdmin && customer.assignedDesigner?.id !== designerId) {
      throw new ForbiddenException('Customer is not assigned to you');
    }

    shortlist.sampleStatus = sampleStatus;
    if (sampleStatus === 'pending') {
      shortlist.sampleRequested = true;
      shortlist.sampleRequestedAt = shortlist.sampleRequestedAt ?? new Date();
    }

    if (sampleStatus === 'none') {
      shortlist.sampleRequested = false;
      shortlist.sampleRequestedAt = null;
    }

    return this.shortlistRepository.save(shortlist);
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
    return this.usersRepository.findOne({
      where: { resetPasswordToken: token },
    });
  }

  /**
   * Save a user entity
   */
  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
