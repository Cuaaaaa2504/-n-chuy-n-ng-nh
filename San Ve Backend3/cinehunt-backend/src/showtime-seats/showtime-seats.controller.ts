import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShowtimeSeatsService } from './showtime-seats.service';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { HoldManySeatsDto } from './dto/hold-many-seats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('showtime-seats')
export class ShowtimeSeatsController {
  constructor(
    private readonly showtimeSeatsService: ShowtimeSeatsService,
  ) {}

  @Get()
  getHello() {
    return this.showtimeSeatsService.getHello();
  }

  @Get(':showtimeId')
  getSeatMap(
    @Param('showtimeId', ParseIntPipe) showtimeId: number,
  ) {
    return this.showtimeSeatsService.getSeatMap(showtimeId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('hold')
  holdSeat(@Request() req, @Body() dto: HoldSeatDto) {
    return this.showtimeSeatsService.holdSeat(req.user.user_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('hold-many')
  holdManySeats(@Request() req, @Body() dto: HoldManySeatsDto) {
    return this.showtimeSeatsService.holdManySeats(req.user.user_id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-holds/list')
  getMyHolds(@Request() req) {
    return this.showtimeSeatsService.getMyHolds(req.user.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('hold-details/:holdId')
  getHoldDetails(
    @Request() req,
    @Param('holdId', ParseIntPipe) holdId: number,
  ) {
    return this.showtimeSeatsService.getHoldDetails(req.user.user_id, holdId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('release/:holdId')
  releaseHold(
    @Request() req,
    @Param('holdId', ParseIntPipe) holdId: number,
  ) {
    return this.showtimeSeatsService.releaseHold(req.user.user_id, holdId);
  }

  @Post('expire-holds')
  expireSeatHolds() {
    return this.showtimeSeatsService.expireSeatHolds();
  }
}
