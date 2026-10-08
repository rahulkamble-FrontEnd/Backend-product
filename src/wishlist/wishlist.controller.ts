import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../auth/types/auth-user.type';
import { UserRole } from '../user/dto/create-user.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { Wishlist } from './wishlist.entity';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get()
  async list(@Request() req: AuthenticatedRequest): Promise<Wishlist[]> {
    return this.wishlistService.list(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post()
  async add(
    @Body() dto: AddWishlistItemDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Wishlist> {
    return this.wishlistService.add(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Delete('product/:productId')
  async removeByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.wishlistService.removeByProduct(req.user.id, productId);
  }
}
