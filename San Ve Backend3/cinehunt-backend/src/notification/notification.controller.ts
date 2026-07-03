import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getMyNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationService.getMyNotifications(user.userId);
  }

  @Get('unread-count')
  countUnread(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationService.countUnread(user.userId);
  }

  /** :id là BIGINT lưu dạng string trong TypeORM -> nhận param dạng string */
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationService.markAsRead(id, user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationService.markAllAsRead(user.userId);
  }

  // ── ADMIN ──────────────────────────────────────────────────────────────────

  @Post('admin/push')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  push(@Body() dto: CreateNotificationDto) {
    return this.notificationService.push(dto);
  }
}
