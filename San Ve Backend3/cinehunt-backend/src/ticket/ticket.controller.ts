import {
  Controller,
  Post,
  Get,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.ticketService.findByCode(code);
  }

  @Post(':code/checkin')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  checkIn(@Param('code') code: string, @Request() req) {
    return this.ticketService.checkIn(code, req.user.user_id);
  }
}
