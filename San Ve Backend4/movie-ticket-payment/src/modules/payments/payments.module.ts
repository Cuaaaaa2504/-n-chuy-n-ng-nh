// src/modules/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { BookingsModule } from '../bookings/bookings.module';
import { ShowtimesModule } from '../showtimes/showtimes.module';
import { Payment } from '../../database/entities/payment.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { BookingDetail } from '../../database/entities/booking-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Ticket, BookingDetail]),
    BookingsModule,
    ShowtimesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}