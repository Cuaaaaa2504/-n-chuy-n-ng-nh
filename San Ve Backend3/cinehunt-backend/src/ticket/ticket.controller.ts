import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Tra cứu vé theo mã nếu có quyền truy cập' })
  findByCode(
    @Param('code') code: string,
    @CurrentUser() requester: CurrentUserPayload,
  ) {
    return this.ticketService.findAccessibleByCode(code, requester);
  }

  @Post(':code/checkin')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Check-in vé tại rạp (STAFF/ADMIN)' })
  checkIn(
    @Param('code') code: string,
    @CurrentUser() staff: CurrentUserPayload,
  ) {
    return this.ticketService.checkIn(code, staff.userId);
  }
}
