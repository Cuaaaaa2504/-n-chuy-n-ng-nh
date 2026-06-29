// src/modules/showtimes/showtimes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowtimesService } from './showtimes.service';
import { ShowtimeSeat } from '../../database/entities/showtime-seat.entity';
import { BookingDetail } from '../../database/entities/booking-detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShowtimeSeat, BookingDetail])],
  providers: [ShowtimesService],
  exports: [ShowtimesService],
})
export class ShowtimesModule {}