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
import { ShowtimesService } from './showtimes.service';

@ApiTags('showtimes')
@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Get()
  findAll() {
    return this.showtimesService.findAll();
  }

  @Get('movie/:movieId')
  findByMovie(@Param('movieId', ParseIntPipe) movieId: number) {
    return this.showtimesService.findByMovie(movieId);
  }

  @Get('room/:roomId')
  findByRoom(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.showtimesService.findByRoom(roomId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.showtimesService.findOne(id);
  }

  @Post('admin')
  create(@Body() dto: CreateShowtimeDto) {
    return this.showtimesService.create(dto);
  }

  @Patch('admin/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.showtimesService.update(id, dto);
  }

  @Delete('admin/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.showtimesService.remove(id);
  }
}
