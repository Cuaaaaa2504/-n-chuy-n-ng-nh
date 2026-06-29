import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { ShowtimeService } from './showtime.service';

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
  create(@Body() dto: CreateShowtimeDto) {
    return this.showtimeService.create(dto);
  }

  @Patch('admin/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.showtimeService.update(id, dto);
  }

  @Delete('admin/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.remove(id);
  }
}
