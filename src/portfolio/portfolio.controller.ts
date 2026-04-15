import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/dto/create-user.dto';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioEntryDto } from './dto/create-portfolio-entry.dto';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async listAll() {
    return this.portfolioService.listAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.BLOGADMIN, UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreatePortfolioEntryDto, @Req() req: any) {
    return this.portfolioService.createEntry(dto, req.user.id);
  }
}
