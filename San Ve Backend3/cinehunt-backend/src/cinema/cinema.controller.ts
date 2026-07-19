import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CinemaService } from './cinema.service';
import { Cinema } from '../entities/cinema.entity';
import { Room } from '../entities/room.entity';
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

  /** Admin: xem cả phòng đã vô hiệu hoá */
  @Get(':id/rooms/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminFindRooms(@Param('id', ParseIntPipe) id: number) {
    return this.cinemaService.adminFindRoomsByCinema(id);
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

  // FIX: báo cáo yêu cầu PATCH /cinemas/:id — trước đây chỉ có PUT
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  patch(
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

  // ── Rooms (phòng chiếu) ──────────────────────────────────────────────────
  // FIX: 3 endpoint dưới đây trước đây KHÔNG tồn tại.

  @Post(':id/rooms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<Room>,
  ) {
    return this.cinemaService.createRoom(id, body);
  }

  @Patch(':id/rooms/:roomId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() body: Partial<Room>,
  ) {
    return this.cinemaService.updateRoom(id, roomId, body);
  }

  @Put(':id/rooms/:roomId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  replaceRoom(
    @Param('id', ParseIntPipe) id: number,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() body: Partial<Room>,
  ) {
    return this.cinemaService.updateRoom(id, roomId, body);
  }

  @Delete(':id/rooms/:roomId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeRoom(
    @Param('id', ParseIntPipe) id: number,
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    return this.cinemaService.deleteRoom(id, roomId);
  }
}
