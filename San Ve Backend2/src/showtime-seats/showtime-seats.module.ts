import { Module } from '@nestjs/common';
import { ShowtimeSeatsController } from './showtime-seats.controller';
import { ShowtimeSeatsService } from './showtime-seats.service';
import { SeatHoldSchedulerService } from './seat-hold-scheduler.service';

@Module({
  controllers: [ShowtimeSeatsController],
  providers: [ShowtimeSeatsService, SeatHoldSchedulerService],
})
export class ShowtimeSeatsModule {}
