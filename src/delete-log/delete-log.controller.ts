import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/dto/create-user.dto';
import { DeleteLogService } from './delete-log.service';

@Controller('delete-logs')
export class DeleteLogController {
  constructor(private readonly deleteLogService: DeleteLogService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deleteLogService.findAll({
      type,
      search,
      from,
      to,
      page,
      limit,
    });
  }
}
