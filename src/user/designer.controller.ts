import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './dto/create-user.dto';
import { UserService } from './user.service';
import { CreateDesignerNoteDto } from './dto/create-designer-note.dto';
import { CreateDesignerRecommendationDto } from './dto/create-designer-recommendation.dto';
import { UpdateDesignerNoteDto } from './dto/update-designer-note.dto';
import { UpdateSampleStatusDto } from './dto/update-sample-status.dto';

@Controller('designer')
export class DesignerController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DESIGNER, UserRole.ADMIN)
  @Get('customers')
  async listAssignedCustomers(
    @Request() req,
    @Query('designerId') designerId?: string,
  ) {
    const role = req.user?.role;
    const effectiveDesignerId =
      role === UserRole.ADMIN ? designerId : req.user?.id;

    if (!effectiveDesignerId) {
      throw new BadRequestException('designerId is required');
    }

    return this.userService.findAssignedCustomers(effectiveDesignerId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DESIGNER, UserRole.ADMIN)
  @Get('customers/:id')
  async getCustomerShortlistAndNotes(
    @Param('id', ParseUUIDPipe) customerId: string,
    @Request() req,
  ) {
    const role = req.user?.role;
    const isAdmin = role === UserRole.ADMIN;
    const effectiveDesignerId = req.user?.id;

    return this.userService.getCustomerShortlistAndNotes(
      customerId,
      effectiveDesignerId,
      isAdmin,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DESIGNER, UserRole.ADMIN)
  @Post('notes')
  async addNote(
    @Body() dto: CreateDesignerNoteDto,
    @Request() req,
  ) {
    const role = req.user?.role;
    const isAdmin = role === UserRole.ADMIN;
    const effectiveDesignerId = req.user?.id;

    return this.userService.addDesignerNote(
      effectiveDesignerId,
      dto.customerId,
      dto.note,
      dto.productId,
      isAdmin,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DESIGNER, UserRole.ADMIN)
  @Put('notes/:id')
  async updateNote(
    @Param('id', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateDesignerNoteDto,
    @Request() req,
  ) {
    const role = req.user?.role;
    const isAdmin = role === UserRole.ADMIN;
    const effectiveDesignerId = req.user?.id;

    return this.userService.updateDesignerNote(
      noteId,
      effectiveDesignerId,
      dto.note,
      dto.productId,
      isAdmin,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DESIGNER, UserRole.ADMIN)
  @Put('samples/:shortlistId')
  async updateSampleStatus(
    @Param('shortlistId', ParseUUIDPipe) shortlistId: string,
    @Body() dto: UpdateSampleStatusDto,
    @Request() req,
  ) {
    const role = req.user?.role;
    const isAdmin = role === UserRole.ADMIN;
    const effectiveDesignerId = req.user?.id;

    return this.userService.updateSampleStatus(
      shortlistId,
      effectiveDesignerId,
      dto.sampleStatus,
      isAdmin,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DESIGNER, UserRole.ADMIN)
  @Post('recommendations')
  async recommendProduct(
    @Body() dto: CreateDesignerRecommendationDto,
    @Request() req,
  ) {
    const role = req.user?.role;
    const isAdmin = role === UserRole.ADMIN;
    const effectiveDesignerId = req.user?.id;

    return this.userService.addDesignerRecommendation(
      effectiveDesignerId,
      dto.customerId,
      dto.productId,
      dto.note,
      isAdmin,
    );
  }
}
