// src/modules/bookings/bookings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { BookingOrder } from '../../database/entities/booking-order.entity';
import { BookingDetail } from '../../database/entities/booking-detail.entity';
import { ShowtimesModule } from '../showtimes/showtimes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingOrder, BookingDetail]),
    ShowtimesModule,
  ],
  providers: [BookingsService, BookingsRepository],
  exports: [BookingsService],
})
export class BookingsModule {}