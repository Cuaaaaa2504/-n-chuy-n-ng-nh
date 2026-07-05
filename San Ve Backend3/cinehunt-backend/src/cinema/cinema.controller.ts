import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CinemaService } from './cinema.service';
import { Cinema } from '../entities/cinema.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() body: Partial<Cinema>) {
    return this.cinemaService.createCinema(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<Cinema>,
  ) {
    return this.cinemaService.updateCinema(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.deleteCinema(id);
  }
}
