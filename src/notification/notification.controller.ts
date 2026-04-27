import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import type { AuthenticatedRequest } from '../auth/types/auth-user.type';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getAllForCurrentUser(
    @Request() req: AuthenticatedRequest,
  ): Promise<Notification[]> {
    return this.notificationService.listForUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/read')
  async markOneAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Notification> {
    return this.notificationService.markOneAsRead(notificationId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('read-all')
  async markAllAsRead(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ updatedCount: number }> {
    return this.notificationService.markAllAsRead(req.user.id);
  }
}
