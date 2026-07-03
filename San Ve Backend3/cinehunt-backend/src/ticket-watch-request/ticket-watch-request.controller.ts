import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TicketWatchRequestService } from './ticket-watch-request.service';
import { CreateWatchRequestDto } from './dto/create-watch-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('ticket-watch-requests')
@UseGuards(JwtAuthGuard)
export class TicketWatchRequestController {
  constructor(private readonly service: TicketWatchRequestService) {}

  @Post()
  create(
    @Body() dto: CreateWatchRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get('my')
  getMyRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getMyRequests(user.userId);
  }

  /** :id là BIGINT -> nhận dạng string, không dùng ParseIntPipe */
  @Delete(':id')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.cancel(id, user.userId);
  }

  // ── ADMIN ──────────────────────────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.service.findAll();
  }

  @Get('admin/by-movie')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findByMovie(@Query('movieId') movieId: string) {
    return this.service.findByMovie(Number(movieId));
  }
}
