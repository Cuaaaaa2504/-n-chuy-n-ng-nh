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
import { OtpCodeModule } from './otp-code/otp-code.module';
import { NotificationModule } from './notification/notification.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { TicketWatchRequestModule } from './ticket-watch-request/ticket-watch-request.module';
import { VoucherModule } from './voucher/voucher.module';     // giữ nguyên (alias promotions)
import { CinemaModule } from './cinema/cinema.module';        // ← THÊM
import { ProductModule } from './product/product.module';     // ← THÊM

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
        database: configService.get<string>('DB_NAME', 'CineHuntDB'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
    OtpCodeModule,
    NotificationModule,
    AuditLogModule,
    TicketWatchRequestModule,
    VoucherModule,      // ← THÊM
    CinemaModule,       // ← THÊM
    ProductModule,      // ← THÊM
  ],
})
export class AppModule {}
