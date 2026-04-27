import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
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

  private sanitizeUser(user: User): User {
    const sanitizedUser: Partial<User> = { ...user };
    delete sanitizedUser.passwordHash;
    delete sanitizedUser.resetPasswordToken;
    delete sanitizedUser.resetPasswordExpires;
    return sanitizedUser as User;
  }

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
    return this.sanitizeUser(savedUser);
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
    return this.sanitizeUser(savedUser);
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
    const where: FindOptionsWhere<User> = {};
    if (role) {
      where.role = role;
    }
    const users = await this.usersRepository.find({
      where,
      relations: ['assignedDesigner'],
    });
    // Remove sensitive data from all returned users
    return users.map((user) => this.sanitizeUser(user));
  }

  async findAssignedCustomers(designerId: string): Promise<User[]> {
    const customers = await this.usersRepository.find({
      where: {
        role: UserRole.CUSTOMER,
        assignedDesigner: { id: designerId } as User,
      },
      relations: ['assignedDesigner'],
    });

    return customers.map((user) => this.sanitizeUser(user));
  }

  async getCustomerShortlistAndNotes(
    customerId: string,
    designerId: string,
    skipOwnershipCheck = false,
  ): Promise<{
    customer: User;
    shortlist: Array<
      Shortlist & {
        recommendations: DesignerRecommendation[];
      }
    >;
    notes: DesignerNote[];
    recommendations: DesignerRecommendation[];
  }> {
    const customer = await this.usersRepository.findOne({
      where: { id: customerId, role: UserRole.CUSTOMER },
      relations: ['assignedDesigner'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${customerId}' not found`);
    }

    if (!skipOwnershipCheck && customer.assignedDesigner?.id !== designerId) {
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

    const recommendations = await this.designerRecommendationsRepository
      .createQueryBuilder('designerRecommendation')
      .leftJoinAndSelect('designerRecommendation.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('designerRecommendation.customerId = :customerId', { customerId })
      .andWhere('designerRecommendation.designerId = :designerId', {
        designerId,
      })
      .orderBy('designerRecommendation.createdAt', 'DESC')
      .getMany();

    const recommendationsByProductId = recommendations.reduce<
      Record<string, DesignerRecommendation[]>
    >((acc, recommendation) => {
      const recommendationGroupKey =
        recommendation.shortlistedProductId || recommendation.productId;
      if (!acc[recommendationGroupKey]) {
        acc[recommendationGroupKey] = [];
      }
      acc[recommendationGroupKey].push(recommendation);
      return acc;
    }, {});

    const shortlistWithRecommendations = shortlist.map((item) => ({
      ...item,
      recommendations: recommendationsByProductId[item.productId] ?? [],
    }));

    return {
      customer: this.sanitizeUser(customer),
      shortlist: shortlistWithRecommendations,
      notes,
      recommendations,
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
    shortlistedProductId: string,
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

    const shortlistItem = await this.shortlistRepository.findOne({
      where: {
        customerId,
        productId: shortlistedProductId,
      },
    });
    if (!shortlistItem) {
      throw new NotFoundException('Shortlisted product context not found');
    }

    if (productId === shortlistedProductId) {
      throw new ConflictException(
        'Recommended product must be different from shortlisted product',
      );
    }

    const recommendation = this.designerRecommendationsRepository.create({
      designerId,
      customerId,
      productId,
      shortlistedProductId,
      note: note || null,
    });

    return this.designerRecommendationsRepository.save(recommendation);
  }

  async updateSampleStatus(
    shortlistId: string,
    designerId: string,
    sampleStatus: 'none' | 'pending' | 'ready' | 'collected' | 'not available',
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
