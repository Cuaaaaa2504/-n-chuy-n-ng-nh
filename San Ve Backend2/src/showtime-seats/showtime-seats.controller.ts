import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShowtimeSeatsService } from './showtime-seats.service';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { HoldManySeatsDto } from './dto/hold-many-seats.dto';

@ApiTags('showtime-seats')
@Controller('showtime-seats')
export class ShowtimeSeatsController {
  constructor(
    private readonly showtimeSeatsService: ShowtimeSeatsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check module' })
  getHello() {
    return this.showtimeSeatsService.getHello();
  }

  @Get(':showtimeId')
  @ApiOperation({ summary: 'Lấy sơ đồ ghế theo suất chiếu' })
  getSeatMap(
    @Param('showtimeId', ParseIntPipe) showtimeId: number,
  ) {
    return this.showtimeSeatsService.getSeatMap(showtimeId);
  }

  @Post('hold')
  @ApiOperation({ summary: 'Giữ 1 ghế tạm thời' })
  holdSeat(@Body() dto: HoldSeatDto) {
    return this.showtimeSeatsService.holdSeat(dto);
  }

  @Post('hold-many')
  @ApiOperation({ summary: 'Giữ nhiều ghế tạm thời' })
  holdManySeats(@Body() dto: HoldManySeatsDto) {
    return this.showtimeSeatsService.holdManySeats(dto);
  }

  @Post('expire-holds')
  @ApiOperation({ summary: 'Chạy tay job nhả ghế hết hạn' })
  expireSeatHolds() {
    return this.showtimeSeatsService.expireSeatHolds();
  }
}
