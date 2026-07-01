import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { MovieModule } from './movie/movie.module';
import { ShowtimeModule } from './showtime/showtime.module';
import { ShowtimeSeatsModule } from './showtime-seats/showtime-seats.module';
import { UsersModule } from './users/users.module';
import { VoucherModule } from './voucher/voucher.module';
import { OtpCodeModule } from './otp-code/otp-code.module';
import { NotificationModule } from './notification/notification.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { TicketWatchRequestModule } from './ticket-watch-request/ticket-watch-request.module';

import { User } from './entities/user.entity';
import { BookingOrder } from './entities/booking-order.entity';
import { BookingDetail } from './entities/booking-detail.entity';
import { SeatHold } from './entities/seat-hold.entity';
import { ShowtimeSeat } from './entities/showtime-seat.entity';
import { Showtime } from './entities/showtime.entity';
import { Seat } from './entities/seat.entity';
import { Room } from './entities/room.entity';
import { Cinema } from './entities/cinema.entity';
import { Movie } from './entities/movie.entity';
import { Payment } from './entities/payment.entity';
import { Ticket } from './entities/ticket.entity';
import { Voucher } from './entities/voucher.entity';
import { ConcessionCombo } from './entities/concession-combo.entity';
import { BookingCombo } from './entities/booking-combo.entity';
import { TicketWatchRequest } from './entities/ticket-watch-request.entity';
import { Genre } from './entities/genre.entity';
import { OtpCode } from './entities/otp-code.entity';
import { Notification } from './entities/notification.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '1433'), 10),
        username: configService.get<string>('DB_USER', 'sa'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME', 'MovieTicketHuntingDB'),
        entities: [
          User, BookingOrder, BookingDetail, SeatHold, ShowtimeSeat,
          Showtime, Seat, Room, Cinema, Movie, Payment, Ticket,
          Voucher, ConcessionCombo, BookingCombo, TicketWatchRequest,
          Genre, OtpCode, Notification, AuditLog,
        ],
        synchronize: false,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        logging: true,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    BookingModule,
    PaymentModule,
    MovieModule,
    ShowtimeModule,
    ShowtimeSeatsModule,
    UsersModule,
    VoucherModule,
    OtpCodeModule,
    NotificationModule,
    AuditLogModule,
    TicketWatchRequestModule,
  ],
})
export class AppModule {}
