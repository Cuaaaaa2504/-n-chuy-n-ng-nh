import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BookingModule } from '../booking/booking.module';
import { Cinema } from '../entities/cinema.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { Movie } from '../entities/movie.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { Showtime } from '../entities/showtime.entity';
import { PaymentModule } from '../payment/payment.module';
import { SeatHoldModule } from '../showtime-seats/seat-hold/seat-hold.module';
import { ShowtimeSeatsModule } from '../showtime-seats/showtime-seats.module';
import { ChatActionService } from './chat-action.service';
import { ChatDataService } from './chat-data.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movie,
      Showtime,
      ShowtimeSeat,
      ConcessionCombo,
      Cinema,
    ]),
    AuthModule,
    BookingModule,
    PaymentModule,
    ShowtimeSeatsModule,
    SeatHoldModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatDataService, ChatActionService],
})
export class ChatModule {}
