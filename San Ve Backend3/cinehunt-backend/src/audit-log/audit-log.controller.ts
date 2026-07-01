import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  // User xem log của chính mình
  @Get('me')
  getMyLogs(@CurrentUser() user: CurrentUserPayload) {
    return this.auditLogService.findByUser(user.userId);
  }

  // ADMIN xem tất cả
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.auditLogService.findAll(Number(page), Number(limit));
  }

  @Get('user/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findByUser(@Param('id', ParseIntPipe) id: number) {
    return this.auditLogService.findByUser(id);
  }
}
