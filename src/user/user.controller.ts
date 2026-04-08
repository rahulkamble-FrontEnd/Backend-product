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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Admin creates a new user (customer, designer, etc.)
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const adminId = req.user.id;
    return this.userService.create(createUserDto, adminId);
  }

  /**
   * Admin updates a user's details
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  /**
   * Admin deactivates a user (soft delete)
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    return this.userService.deactivate(id);
  }

  /**
   * Admin lists all users, optionally filtered by role
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async listAll(@Query('role') role?: string) {
    return this.userService.findAll(role);
  }
}
