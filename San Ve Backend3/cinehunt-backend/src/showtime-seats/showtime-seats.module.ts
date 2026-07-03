import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowtimeSeatsController } from './showtime-seats.controller';
import { ShowtimeSeatsService } from './showtime-seats.service';
import { SeatHoldSchedulerService } from './seat-hold-scheduler.service';
import { SeatHoldModule } from './seat-hold/seat-hold.module';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { Seat } from '../entities/seat.entity';
import { Showtime } from '../entities/showtime.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShowtimeSeat, SeatHold, Seat, Showtime]),
    SeatHoldModule,
  ],
  controllers: [ShowtimeSeatsController],
  providers: [ShowtimeSeatsService, SeatHoldSchedulerService],
  exports: [ShowtimeSeatsService],
})
export class ShowtimeSeatsModule {}
