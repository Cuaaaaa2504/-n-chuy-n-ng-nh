import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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

@Controller('watch-requests')
@UseGuards(JwtAuthGuard)
export class TicketWatchRequestController {
  constructor(private readonly service: TicketWatchRequestService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateWatchRequestDto,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get('me')
  getMyRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getMyRequests(user.userId);
  }

  @Delete(':id')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.cancel(id, user.userId);
  }

  // ADMIN
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.service.findAll();
  }

  @Get('movie/:movieId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  findByMovie(@Param('movieId', ParseIntPipe) movieId: number) {
    return this.service.findByMovie(movieId);
  }
}
