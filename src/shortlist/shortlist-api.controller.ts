import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/dto/create-user.dto';
import { Shortlist } from './shortlist.entity';
import { AddShortlistItemDto } from './dto/add-shortlist-item.dto';
import { UpdateShortlistNoteDto } from './dto/update-shortlist-note.dto';
import {
  ShortlistApiService,
  ShortlistListItem,
} from './shortlist-api.service';

@Controller('shortlist')
export class ShortlistApiController {
  constructor(private readonly shortlistApiService: ShortlistApiService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post()
  async create(
    @Body() dto: AddShortlistItemDto,
    @Request() req,
  ): Promise<Shortlist> {
    return this.shortlistApiService.create(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post(':id/sample')
  async requestSample(
    @Param('id', ParseUUIDPipe) shortlistId: string,
    @Request() req,
  ): Promise<Shortlist> {
    return this.shortlistApiService.requestSample(shortlistId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get()
  async list(@Request() req): Promise<ShortlistListItem[]> {
    return this.shortlistApiService.list(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Put(':id/note')
  async updateNote(
    @Param('id', ParseUUIDPipe) shortlistId: string,
    @Body() dto: UpdateShortlistNoteDto,
    @Request() req,
  ): Promise<Shortlist> {
    return this.shortlistApiService.updateNote(
      shortlistId,
      req.user.id,
      dto.customerNote,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) shortlistId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.shortlistApiService.remove(shortlistId, req.user.id);
  }
}
