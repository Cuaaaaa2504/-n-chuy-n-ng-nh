import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { BookingModule } from '../booking/booking.module';
import { Payment } from '../entities/payment.entity';
import { Ticket } from '../entities/ticket.entity';
import { BookingDetail } from '../entities/booking-detail.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Ticket, BookingDetail, ShowtimeSeat]),
    BookingModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository],
  exports: [PaymentService],
})
export class PaymentModule {}
