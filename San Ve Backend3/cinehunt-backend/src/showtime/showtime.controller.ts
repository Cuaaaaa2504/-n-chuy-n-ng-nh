import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { ShowtimeService } from './showtime.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('showtimes')
@Controller('showtimes')
export class ShowtimeController {
  constructor(private readonly showtimeService: ShowtimeService) {}

  @Get()
  findAll() {
    return this.showtimeService.findAll();
  }

  @Get('movie/:movieId')
  findByMovie(@Param('movieId', ParseIntPipe) movieId: number) {
    return this.showtimeService.findByMovie(movieId);
  }

  @Get('room/:roomId')
  findByRoom(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.showtimeService.findByRoom(roomId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.findOne(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateShowtimeDto) {
    return this.showtimeService.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.showtimeService.update(id, dto);
  }

  /**
   * FIX BUG-01 (vá dữ liệu cũ): các suất chiếu được tạo TRƯỚC khi có auto-seed
   * vẫn đang có bảng showtime_seats rỗng, và tự chúng sẽ không bao giờ tự sinh
   * ghế. Endpoint này cho phép admin sinh bù. An toàn khi gọi lại nhiều lần
   * (idempotent — chỉ thêm ghế còn thiếu).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/:id/generate-seats')
  generateSeats(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.generateSeats(id);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.remove(id);
  }
}
