import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from '../entities/showtime.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { Room } from '../entities/room.entity';
import { Seat } from '../entities/seat.entity';
import { ShowtimeController } from './showtime.controller';
import { ShowtimeService } from './showtime.service';

@Module({
  imports: [TypeOrmModule.forFeature([Showtime, ShowtimeSeat, Room, Seat])],
  controllers: [ShowtimeController],
  providers: [ShowtimeService],
  exports: [ShowtimeService],
})
export class ShowtimeModule {}
