import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cinema } from '../entities/cinema.entity';
import { Room } from '../entities/room.entity';
import { Seat } from '../entities/seat.entity';
import { SeatType } from '../entities/seat-type.entity';
import { CinemaController } from './cinema.controller';
import { CinemaService } from './cinema.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cinema, Room, Seat, SeatType])],
  controllers: [CinemaController],
  providers: [CinemaService],
  exports: [CinemaService],
})
export class CinemaModule {}
