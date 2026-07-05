import { Controller, Get, Post, Put, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CinemaService } from './cinema.service';
import { Cinema } from '../entities/cinema.entity';

@Controller('cinemas')
export class CinemaController {
  constructor(private readonly cinemaService: CinemaService) {}

  @Get()
  findAll() {
    return this.cinemaService.findAllCinemas();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.findCinemaById(id);
  }

  @Get(':id/rooms')
  findRooms(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.findRoomsByCinema(id);
  }

  @Post()
  create(@Body() body: Partial<Cinema>) {
    return this.cinemaService.createCinema(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<Cinema>) {
    return this.cinemaService.updateCinema(id, body);
  }
}
