import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BookingModule } from './booking/booking.module';
import { ShowtimeSeatsModule } from './showtime-seats/showtime-seats.module';
import { MovieModule } from './movie/movie.module';
import { CinemaModule } from './cinema/cinema.module';
import { ConcessionComboModule } from './concession-combo/concession-combo.module';
import { PaymentModule } from './payment/payment.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VoucherModule } from './voucher/voucher.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationModule } from './notification/notification.module';
import { RefundModule } from './refund/refund.module';
import { TicketModule } from './ticket/ticket.module';
import { OtpCodeModule } from './otp-code/otp-code.module';
import { ShowtimeModule } from './showtime/showtime.module';
import { TicketWatchRequestModule } from './ticket-watch-request/ticket-watch-request.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Global rate limit: 20 requests / 60s per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get<string>('DB_HOST'),
        // FIX: parseInt bắt buộc vì process.env luôn là string,
        // configService.get<number>() không tự ép kiểu
        port: parseInt(configService.get<string>('DB_PORT') ?? '1433', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        options: { encrypt: false },
      }),
    }),
    BookingModule,
    ShowtimeSeatsModule,
    MovieModule,
    CinemaModule,
    ConcessionComboModule,
    PaymentModule,
    UsersModule,
    AuthModule,
    VoucherModule,
    AuditLogModule,
    NotificationModule,
    RefundModule,
    TicketModule,
    OtpCodeModule,
    ShowtimeModule,
    TicketWatchRequestModule,
    ProductModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally across all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
