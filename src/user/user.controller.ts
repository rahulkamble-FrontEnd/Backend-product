import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Put,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type {
  AuthUser,
  AuthenticatedRequest,
} from '../auth/types/auth-user.type';
import {
  getUserManagerScope,
  LIMITED_MANAGEABLE_ROLES,
  type UserManagerScope,
} from './user-manager-access';

const LIMITED_UPDATE_FIELDS = new Set<keyof UpdateUserDto>([
  'assignedDesignerId',
  'secondaryDesignerId',
]);

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private requireUserManager(user: AuthUser): Exclude<UserManagerScope, null> {
    const scope = getUserManagerScope(user);
    if (!scope) {
      throw new ForbiddenException(
        `Role "${user.role}" is not allowed for this action`,
      );
    }
    return scope;
  }

  /**
   * Admin creates a new user (customer, designer, etc.)
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USERADMIN, UserRole.DESIGNER)
  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const scope = this.requireUserManager(req.user);
    if (
      scope === 'limited' &&
      !LIMITED_MANAGEABLE_ROLES.includes(createUserDto.role)
    ) {
      throw new ForbiddenException(
        'You can only create customers or designers',
      );
    }
    const adminId = req.user.id;
    return this.userService.create(createUserDto, adminId);
  }

  /**
   * Admin updates a user's details
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USERADMIN, UserRole.DESIGNER)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const scope = this.requireUserManager(req.user);
    if (scope === 'limited') {
      const disallowed = (
        Object.keys(updateUserDto) as Array<keyof UpdateUserDto>
      ).filter(
        (key) =>
          updateUserDto[key] !== undefined && !LIMITED_UPDATE_FIELDS.has(key),
      );
      if (disallowed.length > 0) {
        throw new ForbiddenException(
          'You can only assign primary/secondary designers',
        );
      }
      const target = await this.userService.findOne(id);
      if (!target || target.role !== (UserRole.CUSTOMER as string)) {
        throw new ForbiddenException(
          'Designers can only be assigned to customers',
        );
      }
    }
    return this.userService.update(id, updateUserDto);
  }

  /**
   * Admin deactivates a user (soft delete)
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USERADMIN)
  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    return this.userService.deactivate(id);
  }

  /**
   * Admin lists all users, optionally filtered by role
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USERADMIN, UserRole.DESIGNER)
  @Get()
  async listAll(
    @Request() req: AuthenticatedRequest,
    @Query('role') role?: string,
  ) {
    const scope = this.requireUserManager(req.user);
    if (scope === 'limited') {
      const roles = role
        ? LIMITED_MANAGEABLE_ROLES.filter((r) => (r as string) === role)
        : LIMITED_MANAGEABLE_ROLES;
      if (roles.length === 0) {
        throw new ForbiddenException(
          'You can only view customers and designers',
        );
      }
      const lists = await Promise.all(
        roles.map((r) => this.userService.findAll(r)),
      );
      return lists.flat();
    }
    return this.userService.findAll(role);
  }

  /**
   * Admin / user admin / limited user manager views a customer's wishlist (read-only)
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USERADMIN, UserRole.DESIGNER)
  @Get(':id/wishlist')
  async getCustomerWishlist(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.requireUserManager(req.user);
    return this.userService.getCustomerWishlist(id);
  }
}
