import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingExpireScheduler } from './scheduler/booking-expire.scheduler';
import { BookingOrder } from '../entities/booking-order.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { SeatHold } from '../entities/seat-hold.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingOrder, BookingDetail, SeatHold, ShowtimeSeat]),
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingExpireScheduler],
  exports: [BookingService],
})
export class BookingModule {}